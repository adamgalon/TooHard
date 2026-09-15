import type { ChallengeId } from '@domain/shared/Identifier';
import type { ProgramId } from '@domain/challenge/ChallengeProgram';
import { CalendarDates, type CalendarDate } from '@domain/value-objects/CalendarDate';

export type ChallengeStatus = 'active' | 'completed' | 'abandoned';

export interface AttemptSummary {
  readonly attempt: number;
  readonly startDate: CalendarDate;
  readonly endedOn: CalendarDate;
  readonly completedDays: number;
  readonly reason: 'failed' | 'abandoned';
}

/**
 * Aggregate root. One challenge holds every attempt the user has made at a
 * programme, so a restart keeps the history instead of erasing it.
 *
 * The entity is a plain immutable record and all behaviour lives in pure
 * functions: no hidden mutation, trivially serialisable, trivially testable.
 */
export interface Challenge {
  readonly id: ChallengeId;
  readonly programId: ProgramId;
  readonly status: ChallengeStatus;
  /** First day of the *current* attempt. */
  readonly startDate: CalendarDate;
  readonly attempt: number;
  readonly createdAt: string;
  readonly completedAt: string | null;
  readonly previousAttempts: readonly AttemptSummary[];
}

export const Challenges = {
  start(input: {
    id: ChallengeId;
    programId: ProgramId;
    startDate: CalendarDate;
    createdAt: string;
  }): Challenge {
    return {
      id: input.id,
      programId: input.programId,
      status: 'active',
      startDate: input.startDate,
      attempt: 1,
      createdAt: input.createdAt,
      completedAt: null,
      previousAttempts: [],
    };
  },

  /** 1-based day number of `date`; 0 or negative when `date` precedes the attempt. */
  dayNumberFor(challenge: Challenge, date: CalendarDate): number {
    return CalendarDates.daysBetween(challenge.startDate, date) + 1;
  },

  dateForDay(challenge: Challenge, dayNumber: number): CalendarDate {
    return CalendarDates.addDays(challenge.startDate, dayNumber - 1);
  },

  lastDate(challenge: Challenge, durationDays: number): CalendarDate {
    return Challenges.dateForDay(challenge, durationDays);
  },

  isWithinAttempt(challenge: Challenge, date: CalendarDate, durationDays: number): boolean {
    const day = Challenges.dayNumberFor(challenge, date);
    return day >= 1 && day <= durationDays;
  },

  /** Archives the current attempt and starts a fresh one on `from`. */
  restart(
    challenge: Challenge,
    input: { from: CalendarDate; endedOn: CalendarDate; completedDays: number },
  ): Challenge {
    const summary: AttemptSummary = {
      attempt: challenge.attempt,
      startDate: challenge.startDate,
      endedOn: input.endedOn,
      completedDays: input.completedDays,
      reason: 'failed',
    };
    return {
      ...challenge,
      status: 'active',
      startDate: input.from,
      attempt: challenge.attempt + 1,
      completedAt: null,
      previousAttempts: [...challenge.previousAttempts, summary],
    };
  },

  complete(challenge: Challenge, completedAt: string): Challenge {
    return { ...challenge, status: 'completed', completedAt };
  },

  abandon(
    challenge: Challenge,
    input: { endedOn: CalendarDate; completedDays: number },
  ): Challenge {
    return {
      ...challenge,
      status: 'abandoned',
      previousAttempts: [
        ...challenge.previousAttempts,
        {
          attempt: challenge.attempt,
          startDate: challenge.startDate,
          endedOn: input.endedOn,
          completedDays: input.completedDays,
          reason: 'abandoned',
        },
      ],
    };
  },

  /** Longest attempt so far, in completed days — the number people quote. */
  bestAttemptDays(challenge: Challenge, currentAttemptDays: number): number {
    return challenge.previousAttempts.reduce(
      (best, attempt) => Math.max(best, attempt.completedDays),
      currentAttemptDays,
    );
  },
} as const;
