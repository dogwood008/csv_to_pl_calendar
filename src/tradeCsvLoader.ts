import fs from "node:fs/promises";
import path from "node:path";
import { TradeRecord } from "./tradeTypes";

export interface TradeCsvLoader {
  loadRecords(): Promise<TradeRecord[]>;
}

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_CSV_RELATIVE_PATH = ["docs", "dummy_kabucom.csv"];

export interface KabucomCsvLoaderOptions {
  csvPath?: string;
}

export function createKabucomCsvLoader(options: KabucomCsvLoaderOptions = {}): TradeCsvLoader {
  const resolvedPath = resolveCsvPath(options.csvPath);
  return new KabucomCsvLoader(resolvedPath);
}

export function createDefaultTradeCsvLoader(): TradeCsvLoader {
  return createKabucomCsvLoader();
}

export function createCsvLoaderFromContent(csvContent: string): TradeCsvLoader {
  return new InlineCsvLoader(csvContent);
}

type FieldIndexMap = Record<string, number>;

interface CsvSchemaDefinition {
  id: "kabucom" | "sbiOtcCfd";
  requiredFields: string[];
  parseRecord(row: string[], fieldIndices: FieldIndexMap): TradeRecord | null;
}

const KABUCOM_REQUIRED_FIELDS = ["成立日", "売買", "取引数量（枚）", "確定損益"];
const SBI_OTC_REQUIRED_FIELDS = ["約定日時", "売/買", "数量", "建玉損益(円)"];

const CSV_SCHEMAS: CsvSchemaDefinition[] = [
  {
    id: "kabucom",
    requiredFields: KABUCOM_REQUIRED_FIELDS,
    parseRecord: parseKabucomRecord,
  },
  {
    id: "sbiOtcCfd",
    requiredFields: SBI_OTC_REQUIRED_FIELDS,
    parseRecord: parseSbiOtcCfdRecord,
  },
];

function ensureWithinProjectRoot(targetPath: string): string {
  const resolved = path.resolve(targetPath);
  const relative = path.relative(PROJECT_ROOT, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("CSVファイルの参照はプロジェクトルート配下のみ許可されています");
  }
  return resolved;
}

function resolveCsvPath(csvPath?: string): string {
  if (csvPath) {
    const trimmed = csvPath.trim();
    if (trimmed.length > 0) {
      const candidate = path.isAbsolute(trimmed)
        ? path.normalize(trimmed)
        : path.resolve(PROJECT_ROOT, trimmed);
      return ensureWithinProjectRoot(candidate);
    }
  }
  return path.resolve(PROJECT_ROOT, ...DEFAULT_CSV_RELATIVE_PATH);
}

class KabucomCsvLoader implements TradeCsvLoader {
  constructor(private readonly csvPath: string) {}

  async loadRecords(): Promise<TradeRecord[]> {
    const content = await fs.readFile(this.csvPath, "utf-8");
    const rows = parseCsv(content);
    return mapRowsToRecords(rows);
  }
}

class InlineCsvLoader implements TradeCsvLoader {
  constructor(private readonly csvContent: string) {}

  async loadRecords(): Promise<TradeRecord[]> {
    const rows = parseCsv(this.csvContent);
    return mapRowsToRecords(rows);
  }
}

function parseCurrency(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-" || trimmed === "−") {
    return 0;
  }

  let sign = 1;
  let index = 0;
  const firstChar = trimmed[0] ?? "";
  if (firstChar === "+" || firstChar === "-" || firstChar === "−") {
    sign = firstChar === "+" ? 1 : -1;
    index = 1;
  }

  const digits = trimmed
    .slice(index)
    .replace(/,/g, "")
    .replace(/円/g, "")
    .trim();

  const parsed = Number.parseFloat(digits);
  return Number.isNaN(parsed) ? 0 : parsed * sign;
}

function parseInteger(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseInt(value.trim().replace(/,/g, ""), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseDecimal(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const normalized = value.trim().replace(/,/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeTimeString(value: string | undefined): string {
  if (!value) {
    return "00:00";
  }
  const [hourRaw, minuteRaw = "00"] = value.split(":");
  const hour = Number.parseInt(hourRaw ?? "0", 10);
  const minute = Number.parseInt(minuteRaw ?? "0", 10);
  const safeHour = Number.isNaN(hour) ? 0 : hour;
  const safeMinute = Number.isNaN(minute) ? 0 : minute;
  return `${safeHour.toString().padStart(2, "0")}:${safeMinute.toString().padStart(2, "0")}`;
}

function toIsoDate(dateString: string | undefined): string | null {
  if (!dateString) {
    return null;
  }
  const [year, month, day] = dateString.split("/");
  if (!year || !month || !day) {
    return null;
  }
  const yyyy = year.padStart(4, "0");
  const mm = month.padStart(2, "0");
  const dd = day.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentFieldChars: string[] = [];
  let inQuotes = false;

  const flushField = (): string => {
    const field = currentFieldChars.join("");
    currentFieldChars = [];
    return field;
  };

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentFieldChars.push('"');
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(flushField());
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      currentRow.push(flushField());
      if (currentRow.some((field) => field.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentFieldChars.push(char);
  }

  const remainingField = flushField();
  if (remainingField.length > 0 || currentRow.length > 0) {
    currentRow.push(remainingField);
    rows.push(currentRow);
  }

  return rows;
}

function mapRowsToRecords(rows: string[][]): TradeRecord[] {
  if (rows.length === 0) {
    return [];
  }
  const [header, ...dataRows] = rows;
  const fieldIndices = header.reduce<FieldIndexMap>((acc, field, index) => {
    const normalizedField = (index === 0 ? field.replace(/^\ufeff/, "") : field).trim();
    acc[normalizedField] = index;
    return acc;
  }, {});

  const schema = detectCsvSchema(fieldIndices);
  if (!schema) {
    return [];
  }

  return dataRows
    .map((row) => schema.parseRecord(row, fieldIndices))
    .filter((record): record is TradeRecord => record !== null);
}

function detectCsvSchema(fieldIndices: FieldIndexMap): CsvSchemaDefinition | null {
  return (
    CSV_SCHEMAS.find((schema) => schema.requiredFields.every((field) => field in fieldIndices)) ??
    null
  );
}

function parseKabucomRecord(row: string[], fieldIndices: FieldIndexMap): TradeRecord | null {
  const date = toIsoDate(row[fieldIndices["成立日"]] ?? "");
  if (!date) {
    return null;
  }

  const isoTime = normalizeTimeString(row[fieldIndices["成立時間"]] ?? "");
  const symbol = (row[fieldIndices["銘柄"]] ?? "").trim();
  const contractMonth = (row[fieldIndices["限月"]] ?? "").trim();
  const side = (row[fieldIndices["売買"]] ?? "").trim();
  const action = (row[fieldIndices["取引"]] ?? "").trim();

  return {
    isoDate: date,
    isoTime,
    isoDateTime: `${date}T${isoTime}:00`,
    symbol,
    contractMonth,
    side,
    action,
    quantity: parseInteger(row[fieldIndices["取引数量（枚）"]] ?? ""),
    price: parseDecimal(row[fieldIndices["成立値段"]] ?? ""),
    fee: parseCurrency(row[fieldIndices["手数料"]] ?? ""),
    grossProfit: parseCurrency(row[fieldIndices["売買損益"]] ?? ""),
    netProfit: parseCurrency(row[fieldIndices["確定損益"]] ?? ""),
  };
}

function parseSbiOtcCfdRecord(row: string[], fieldIndices: FieldIndexMap): TradeRecord | null {
  const dateTimeParts = parseSbiDateTime(row[fieldIndices["約定日時"]] ?? "");
  if (!dateTimeParts) {
    return null;
  }

  const grossProfit = parseCurrency(row[fieldIndices["建玉損益(円)"]] ?? "");
  const interest = parseCurrency(row[fieldIndices["金利調整額合計(円)"]] ?? "");
  const priceAdjustment = parseCurrency(row[fieldIndices["価格調整額合計(円)"]] ?? "");
  const funding = parseCurrency(row[fieldIndices["ファンディングレート合計(円)"]] ?? "");
  const settlementAmount = parseCurrency(row[fieldIndices["受渡金額(円)"]] ?? "");

  const netProfitFromComponents = grossProfit + interest + priceAdjustment + funding;
  const netProfit =
    settlementAmount !== 0
      ? settlementAmount
      : netProfitFromComponents !== 0
        ? netProfitFromComponents
        : 0;

  return {
    isoDate: dateTimeParts.isoDate,
    isoTime: dateTimeParts.isoTime,
    isoDateTime: dateTimeParts.isoDateTime,
    symbol: (row[fieldIndices["銘柄"]] ?? "").trim(),
    contractMonth: "",
    side: (row[fieldIndices["売/買"]] ?? "").trim(),
    action: (row[fieldIndices["取引区分"]] ?? "").trim(),
    quantity: parseDecimal(row[fieldIndices["数量"]] ?? ""),
    price: parseDecimal(row[fieldIndices["約定価格"]] ?? ""),
    fee: 0,
    grossProfit,
    netProfit,
  };
}

function parseSbiDateTime(value: string | undefined): {
  isoDate: string;
  isoTime: string;
  isoDateTime: string;
} | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const [datePart, timePartRaw] = trimmed.split(/\s+/);
  const isoDate = toIsoDate(datePart);
  if (!isoDate) {
    return null;
  }

  if (!timePartRaw) {
    return {
      isoDate,
      isoTime: "00:00",
      isoDateTime: `${isoDate}T00:00:00`,
    };
  }

  const [hourRaw, minuteRaw = "00", secondRaw = "00"] = timePartRaw.split(":");
  const hour = safeInteger(hourRaw);
  const minute = safeInteger(minuteRaw);
  const second = safeInteger(secondRaw);
  const hh = padTimePart(hour);
  const mm = padTimePart(minute);
  const ss = padTimePart(second);

  return {
    isoDate,
    isoTime: `${hh}:${mm}`,
    isoDateTime: `${isoDate}T${hh}:${mm}:${ss}`,
  };
}

function safeInteger(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function padTimePart(value: number): string {
  return Math.max(0, value).toString().padStart(2, "0");
}
