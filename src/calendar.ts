export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export type WeekdayLabel = typeof WEEKDAY_LABELS[number];

export interface CalendarDay {
  day: number;
  isoDate: string;
  isToday: boolean;
}

export type CalendarWeek = (CalendarDay | null)[];

export interface CalendarMonth {
  month: number;
  title: string;
  weeks: CalendarWeek[];
}

export interface CalendarYear {
  year: number;
  months: CalendarMonth[];
  weekdayLabels: WeekdayLabel[];
}

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function buildCalendarDay(
  year: number,
  monthIndex: number,
  day: number,
  today: Date,
): CalendarDay {
  const isoDate = [
    year,
    (monthIndex + 1).toString().padStart(2, "0"),
    day.toString().padStart(2, "0"),
  ].join("-");

  return {
    day,
    isoDate,
    isToday:
      today.getFullYear() === year &&
      today.getMonth() === monthIndex &&
      today.getDate() === day,
  };
}

function createMonth(year: number, monthIndex: number, today: Date): CalendarMonth {
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();

  const weeks: CalendarWeek[] = [];
  let currentWeek: CalendarWeek = [];

  for (let i = 0; i < firstDayOfWeek; i += 1) {
    currentWeek.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    currentWeek.push(buildCalendarDay(year, monthIndex, day, today));

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return {
    month: monthIndex + 1,
    title: `${year}年${(monthIndex + 1).toString().padStart(2, "0")}月`,
    weeks,
  };
}

export function createYearCalendar(year: number): CalendarYear {
  if (!Number.isInteger(year) || year <= 0 || year > 9999) {
    throw new Error(
      `年の指定が不正です（1〜9999の整数で指定してください）: "${year}"`,
    );
  }

  const today = new Date();
  const months = Array.from({ length: 12 }, (_, index) => createMonth(year, index, today));

  return {
    year,
    months,
    weekdayLabels: [...WEEKDAY_LABELS],
  };
}

export function parseYear(value: string | undefined, fallbackYear: number): number {
  if (value === undefined || value.trim() === "") {
    return fallbackYear;
  }

  const parsedYear = Number.parseInt(value, 10);

  if (Number.isNaN(parsedYear)) {
    throw new Error(`年は数値で指定してください: "${value}"`);
  }

  if (parsedYear <= 0 || parsedYear > 9999) {
    throw new Error(
      `年の指定が不正です（1〜9999の整数で指定してください）: "${value}"`,
    );
  }

  return parsedYear;
}
