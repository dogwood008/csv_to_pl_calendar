import { createDefaultTradeCsvLoader, TradeCsvLoader } from "./tradeCsvLoader";
import { DailyTradeSummary, TradeDataForYear, TradeDetail, TradeRecord } from "./tradeTypes";

let cachedRecords: TradeRecord[] | null = null;
let cacheErrorLogged = false;
let customLoader: TradeCsvLoader | null = null;

export function setTradeCsvLoader(loader: TradeCsvLoader | null): void {
  customLoader = loader;
  cachedRecords = null;
  cacheErrorLogged = false;
}

function getActiveLoader(): TradeCsvLoader {
  if (customLoader) {
    return customLoader;
  }
  customLoader = createDefaultTradeCsvLoader();
  return customLoader;
}


async function loadTradeRecords(): Promise<TradeRecord[]> {
  if (cachedRecords) {
    return cachedRecords;
  }
  const loader = getActiveLoader();
  try {
    cachedRecords = await loader.loadRecords();
  } catch (error) {
    if (!cacheErrorLogged) {
      cacheErrorLogged = true;
      const message = error instanceof Error ? error.message : String(error);
      const loaderLabel = Object.getPrototypeOf(loader)?.constructor?.name ?? "TradeCsvLoader";
      console.warn(`取引CSVの読み込みに失敗しました (${loaderLabel}): ${message}`);
    }
    cachedRecords = [];
  }

  return cachedRecords;
}

function sortTrades(trades: TradeDetail[]): TradeDetail[] {
  return trades
    .slice()
    .sort((a, b) => (a.isoDateTime < b.isoDateTime ? -1 : a.isoDateTime > b.isoDateTime ? 1 : 0));
}

export async function getTradeDataForYear(year: number): Promise<TradeDataForYear> {
  const records = await loadTradeRecords();
  const summaries = new Map<string, DailyTradeSummary>();
  const tradesByDate = new Map<string, TradeDetail[]>();

  records.forEach((record) => {
    if (!record.isoDate.startsWith(`${year}-`)) {
      return;
    }
    const existing = summaries.get(record.isoDate);
    const base: DailyTradeSummary =
      existing ?? {
        isoDate: record.isoDate,
        tradeCount: 0,
        buyCount: 0,
        sellCount: 0,
        totalQuantity: 0,
        netProfit: 0,
      };
    base.tradeCount += 1;
    base.totalQuantity += record.quantity;
    if (record.side === "買") {
      base.buyCount += 1;
    } else if (record.side === "売") {
      base.sellCount += 1;
    }
    base.netProfit += record.netProfit;
    summaries.set(record.isoDate, base);

    const existingTrades = tradesByDate.get(record.isoDate) ?? [];
    existingTrades.push(record);
    tradesByDate.set(record.isoDate, existingTrades);
  });

  const sortedTradesByDate = Array.from(tradesByDate.entries()).reduce<
    Record<string, TradeDetail[]>
  >((acc, [isoDate, trades]) => {
    acc[isoDate] = sortTrades(trades);
    return acc;
  }, {});

  return {
    summaries: Object.fromEntries(summaries),
    tradesByDate: sortedTradesByDate,
  };
}

export async function getDailyTradeSummariesForYear(
  year: number,
): Promise<Record<string, DailyTradeSummary>> {
  const { summaries } = await getTradeDataForYear(year);
  return summaries;
}
