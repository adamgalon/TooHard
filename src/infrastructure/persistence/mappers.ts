import type { Challenge } from '@domain/challenge/Challenge';
import type { ProgramId } from '@domain/challenge/ChallengeProgram';
import type { DailyLog } from '@domain/challenge/DailyLog';
import { ChallengeIds, DailyLogIds } from '@domain/shared/Identifier';
import type { AppSettings } from '@domain/settings/AppSettings';
import { CalendarDates } from '@domain/value-objects/CalendarDate';
import type {
  ChallengeRecord,
  DailyLogRecord,
  SettingsRecord,
} from '@infrastructure/persistence/schemas';

/**
 * Data Mapper pattern: entities never learn how they are stored, and stored
 * records never leak branded types the schema cannot express.
 */
export const ChallengeMapper = {
  toDomain(record: ChallengeRecord): Challenge {
    return {
      id: ChallengeIds.unsafe(record.id),
      programId: record.programId as ProgramId,
      status: record.status,
      startDate: CalendarDates.unsafe(record.startDate),
      attempt: record.attempt,
      createdAt: record.createdAt,
      completedAt: record.completedAt,
      previousAttempts: record.previousAttempts.map((attempt) => ({
        attempt: attempt.attempt,
        startDate: CalendarDates.unsafe(attempt.startDate),
        endedOn: CalendarDates.unsafe(attempt.endedOn),
        completedDays: attempt.completedDays,
        reason: attempt.reason,
      })),
    };
  },

  toRecord(challenge: Challenge): ChallengeRecord {
    return {
      id: challenge.id,
      programId: challenge.programId,
      status: challenge.status,
      startDate: challenge.startDate,
      attempt: challenge.attempt,
      createdAt: challenge.createdAt,
      completedAt: challenge.completedAt,
      previousAttempts: challenge.previousAttempts.map((attempt) => ({ ...attempt })),
    };
  },
} as const;

export const DailyLogMapper = {
  toDomain(record: DailyLogRecord): DailyLog {
    return {
      id: DailyLogIds.unsafe(record.id),
      challengeId: ChallengeIds.unsafe(record.challengeId),
      attempt: record.attempt,
      date: CalendarDates.unsafe(record.date),
      dayNumber: record.dayNumber,
      status: record.status,
      entries: record.entries,
      note: record.note,
      updatedAt: record.updatedAt,
    };
  },

  toRecord(log: DailyLog): DailyLogRecord {
    return {
      id: log.id,
      challengeId: log.challengeId,
      attempt: log.attempt,
      date: log.date,
      dayNumber: log.dayNumber,
      status: log.status,
      entries: { ...log.entries },
      note: log.note,
      updatedAt: log.updatedAt,
    };
  },
} as const;

export const SettingsMapper = {
  toDomain: (record: SettingsRecord): AppSettings => ({ ...record }),
  toRecord: (settings: AppSettings): SettingsRecord => ({
    themePreference: settings.themePreference,
    hapticsEnabled: settings.hapticsEnabled,
    reminderEnabled: settings.reminderEnabled,
    reminder: { ...settings.reminder },
    hasSeenIntro: settings.hasSeenIntro,
  }),
} as const;
