import { TradeCsvSchema } from "./schemaTypes";
import {
  normalizeTimeString,
  parseCurrency,
  parseDecimal,
  parseInteger,
  toIsoDate,
} from "./parsers";

const REQUIRED_FIELDS = ["成立日", "売買", "取引数量（枚）", "確定損益"];

export const kabucomSchema: TradeCsvSchema = {
  id: "kabucom",
  requiredFields: REQUIRED_FIELDS,
  parseRecord: (row, fieldIndices) => {
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
  },
};
