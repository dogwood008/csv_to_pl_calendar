import { createYearCalendar } from "./calendar";
import { getTradeDataForYear, TradeDataQueryOptions } from "./trades";

export interface CalendarPayload {
  year: number;
  months: ReturnType<typeof createYearCalendar>["months"];
  weekdayLabels: ReturnType<typeof createYearCalendar>["weekdayLabels"];
  tradeSummaries: Awaited<ReturnType<typeof getTradeDataForYear>>["summaries"];
  dailyTrades: Awaited<ReturnType<typeof getTradeDataForYear>>["tradesByDate"];
}

async function buildCalendarPayload(
  year: number,
  options?: TradeDataQueryOptions,
): Promise<CalendarPayload> {
  const calendar = createYearCalendar(year);
  const { summaries, tradesByDate } = await getTradeDataForYear(year, options);
  return {
    ...calendar,
    tradeSummaries: summaries,
    dailyTrades: tradesByDate,
  };
}

export async function fetchCalendarData(
  year: number,
  options: TradeDataQueryOptions = {},
): Promise<CalendarPayload> {
  return buildCalendarPayload(year, options);
}
