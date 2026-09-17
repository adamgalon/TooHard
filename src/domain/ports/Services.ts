import type { Result } from '@core/result/Result';
import type { Challenge } from '@domain/challenge/Challenge';
import type { DailyLog } from '@domain/challenge/DailyLog';
import type { AppSettings } from '@domain/settings/AppSettings';

export type PhotoSource = 'camera' | 'library';

export interface CapturedPhoto {
  readonly uri: string;
  readonly width: number;
  readonly height: number;
}

/** Port over the platform picker/camera. */
export interface PhotoCapture {
  capture(source: PhotoSource): Promise<Result<CapturedPhoto | null>>;
}

/** Port over durable media storage — keeps photos out of the cache directory. */
export interface PhotoStorage {
  persist(sourceUri: string, fileName: string): Promise<Result<string>>;
  remove(uri: string): Promise<Result<void>>;
}

export interface DailyReminder {
  readonly hour: number;
  readonly minute: number;
}

export interface ReminderScheduler {
  schedule(reminder: DailyReminder, body: string): Promise<Result<void>>;
  cancelAll(): Promise<Result<void>>;
}

export type FeedbackKind = 'success' | 'warning' | 'error' | 'selection' | 'impact';

export interface HapticFeedback {
  trigger(kind: FeedbackKind): void;
}

/**
 * Everything a backup needs to restore the app to its current state: the
 * challenge (across every attempt it's had, not just the active one — see
 * `BackupDataUseCase`), every daily log, and settings. Plain domain types,
 * not storage records — turning this into a portable file format is the
 * adapter's job, not the use case's (see `ArchitectureRules` in AGENTS.md:
 * application code doesn't know about JSON envelopes or Zod schemas).
 */
export interface BackupBundle {
  readonly challenge: Challenge | null;
  readonly dailyLogs: readonly DailyLog[];
  readonly settings: AppSettings;
  readonly exportedAt: string;
}

export interface BackupFileInfo {
  readonly fileName: string;
}

/** Port over turning a `BackupBundle` into a file the user controls, and back. */
export interface BackupIO {
  /** Serializes the bundle and hands it to the OS share sheet. */
  writeAndShare(bundle: BackupBundle): Promise<Result<BackupFileInfo>>;
  /** Opens a file picker; resolves to `null` if the user cancels it. */
  pickAndRead(): Promise<Result<BackupBundle | null>>;
}
