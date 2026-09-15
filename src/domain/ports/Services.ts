import type { Result } from '@core/result/Result';

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
