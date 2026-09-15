import type { Brand } from '@core/types/Brand';
import { AppErrors } from '@core/errors/AppError';
import { err, ok, type Result } from '@core/result/Result';

/** 1-based position of a day inside a challenge attempt (day 1 … day 75). */
export type DayNumber = Brand<number, 'DayNumber'>;

export const DayNumbers = {
  of(value: number, totalDays: number): Result<DayNumber> {
    if (!Number.isInteger(value) || value < 1) {
      return err(AppErrors.validation(`Day number must be a positive integer, got ${value}.`));
    }
    if (value > totalDays) {
      return err(AppErrors.validation(`Day ${value} is beyond the ${totalDays}-day programme.`));
    }
    return ok(value as DayNumber);
  },

  unsafe: (value: number): DayNumber => value as DayNumber,
  first: (): DayNumber => 1 as DayNumber,
} as const;
