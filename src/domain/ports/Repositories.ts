import type { Result } from '@core/result/Result';
import type { ChallengeId } from '@domain/shared/Identifier';
import type { Challenge } from '@domain/challenge/Challenge';
import type { DailyLog } from '@domain/challenge/DailyLog';
import type { AppSettings } from '@domain/settings/AppSettings';
import type { CalendarDate } from '@domain/value-objects/CalendarDate';

/**
 * Repository ports. The application layer depends on these interfaces only;
 * AsyncStorage, SQLite or a future sync backend are all just implementations.
 */
export interface ChallengeRepository {
  /** The single active/most recent challenge, or `null` before onboarding. */
  find(): Promise<Result<Challenge | null>>;
  save(challenge: Challenge): Promise<Result<void>>;
  clear(): Promise<Result<void>>;
}

export interface DailyLogQuery {
  readonly challengeId: ChallengeId;
  readonly attempt: number;
}

export interface DailyLogRepository {
  findByDate(query: DailyLogQuery & { date: CalendarDate }): Promise<Result<DailyLog | null>>;
  listForAttempt(query: DailyLogQuery): Promise<Result<DailyLog[]>>;
  save(log: DailyLog): Promise<Result<void>>;
  saveMany(logs: readonly DailyLog[]): Promise<Result<void>>;
  clear(): Promise<Result<void>>;
}

export interface SettingsRepository {
  load(): Promise<Result<AppSettings>>;
  save(settings: AppSettings): Promise<Result<void>>;
}
