import type { Specification } from '@domain/shared/Specification';
import type { DailyLog } from '@domain/challenge/DailyLog';
import type { CalendarDate } from '@domain/value-objects/CalendarDate';
import { CalendarDates } from '@domain/value-objects/CalendarDate';
import type { DayCompleteSpecification } from '@domain/challenge/specifications/DayCompleteSpecification';

/**
 * A day is missed once it is in the past and still incomplete. Today is never
 * missed — the user still has until midnight.
 */
export class DayMissedSpecification implements Specification<DailyLog> {
  constructor(
    private readonly today: CalendarDate,
    private readonly dayComplete: DayCompleteSpecification,
  ) {}

  readonly description = 'the day is in the past and was left incomplete';

  isSatisfiedBy(log: DailyLog): boolean {
    if (!CalendarDates.isBefore(log.date, this.today)) return false;
    return !this.dayComplete.isSatisfiedBy(log);
  }
}
