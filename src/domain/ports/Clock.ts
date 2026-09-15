import { CalendarDates, type CalendarDate } from '@domain/value-objects/CalendarDate';

/**
 * Port over "now". Nothing in the domain or application layer calls `new Date()`
 * directly, which is what makes day-rollover logic testable.
 */
export interface Clock {
  now(): Date;
  nowIso(): string;
  today(): CalendarDate;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }

  nowIso(): string {
    return this.now().toISOString();
  }

  today(): CalendarDate {
    return CalendarDates.fromDate(this.now());
  }
}

/** Test double: advances only when you tell it to. */
export class FixedClock implements Clock {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current.getTime());
  }

  nowIso(): string {
    return this.current.toISOString();
  }

  today(): CalendarDate {
    return CalendarDates.fromDate(this.current);
  }

  set(date: Date): void {
    this.current = date;
  }

  advanceDays(days: number): void {
    const next = new Date(this.current.getTime());
    next.setDate(next.getDate() + days);
    this.current = next;
  }
}
