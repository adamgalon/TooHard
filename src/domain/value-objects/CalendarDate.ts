import { addDays, differenceInCalendarDays, format, isValid, parse } from 'date-fns';

import type { Brand } from '@core/types/Brand';
import { AppErrors } from '@core/errors/AppError';
import { err, ok, type Result } from '@core/result/Result';

/**
 * A calendar day in the user's local timezone, stored as `YYYY-MM-DD`.
 *
 * The challenge is scored per day, never per instant, so the domain must not
 * traffic in `Date` objects: two users in different timezones would otherwise
 * disagree about which day a 23:50 workout belongs to.
 */
export type CalendarDate = Brand<string, 'CalendarDate'>;

const PATTERN = 'yyyy-MM-dd';
const SHAPE = /^\d{4}-\d{2}-\d{2}$/;

export const CalendarDates = {
  fromDate(date: Date): CalendarDate {
    return format(date, PATTERN) as CalendarDate;
  },

  parse(value: string): Result<CalendarDate> {
    if (!SHAPE.test(value)) {
      return err(AppErrors.validation(`"${value}" is not a YYYY-MM-DD date.`));
    }
    const parsed = parse(value, PATTERN, new Date());
    if (!isValid(parsed)) {
      return err(AppErrors.validation(`"${value}" is not a real calendar date.`));
    }
    return ok(value as CalendarDate);
  },

  /** Unsafe variant for literals the developer controls (fixtures, migrations). */
  unsafe(value: string): CalendarDate {
    return value as CalendarDate;
  },

  toDate(value: CalendarDate): Date {
    return parse(value, PATTERN, new Date());
  },

  addDays(value: CalendarDate, amount: number): CalendarDate {
    return CalendarDates.fromDate(addDays(CalendarDates.toDate(value), amount));
  },

  /** `b - a` in whole calendar days: negative when `b` precedes `a`. */
  daysBetween(a: CalendarDate, b: CalendarDate): number {
    return differenceInCalendarDays(CalendarDates.toDate(b), CalendarDates.toDate(a));
  },

  compare(a: CalendarDate, b: CalendarDate): number {
    return a < b ? -1 : a > b ? 1 : 0;
  },

  isBefore: (a: CalendarDate, b: CalendarDate): boolean => a < b,
  isAfter: (a: CalendarDate, b: CalendarDate): boolean => a > b,
  isSame: (a: CalendarDate, b: CalendarDate): boolean => a === b,

  /** Inclusive range, ordered ascending. */
  range(from: CalendarDate, to: CalendarDate): CalendarDate[] {
    const total = CalendarDates.daysBetween(from, to);
    if (total < 0) return [];
    return Array.from({ length: total + 1 }, (_, index) => CalendarDates.addDays(from, index));
  },

  format(value: CalendarDate, pattern: string): string {
    return format(CalendarDates.toDate(value), pattern);
  },
} as const;
