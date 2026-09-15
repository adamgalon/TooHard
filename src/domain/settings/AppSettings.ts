import type { DailyReminder } from '@domain/ports/Services';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface AppSettings {
  readonly themePreference: ThemePreference;
  readonly hapticsEnabled: boolean;
  readonly reminderEnabled: boolean;
  readonly reminder: DailyReminder;
  /** Shown once; keeps the onboarding stack out of the way afterwards. */
  readonly hasSeenIntro: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  themePreference: 'system',
  hapticsEnabled: true,
  reminderEnabled: false,
  reminder: { hour: 20, minute: 0 },
  hasSeenIntro: false,
};
