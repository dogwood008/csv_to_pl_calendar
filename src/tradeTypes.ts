export interface DailyTradeSummary {
  isoDate: string;
  tradeCount: number;
  buyCount: number;
  sellCount: number;
  totalQuantity: number;
  netProfit: number;
}

export interface TradeDetail {
  isoDate: string;
  isoTime: string;
  isoDateTime: string;
  symbol: string;
  contractMonth: string;
  side: string;
  action: string;
  quantity: number;
  price: number;
  fee: number;
  grossProfit: number;
  netProfit: number;
}

export type TradeRecord = TradeDetail;

export interface TradeDataForYear {
  summaries: Record<string, DailyTradeSummary>;
  tradesByDate: Record<string, TradeDetail[]>;
}
