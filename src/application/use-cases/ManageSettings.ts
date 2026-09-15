import { ok, type Result } from '@core/result/Result';
import type { Logger } from '@core/logger/Logger';
import { DEFAULT_SETTINGS, type AppSettings } from '@domain/settings/AppSettings';
import type { SettingsRepository } from '@domain/ports/Repositories';
import type { ReminderScheduler } from '@domain/ports/Services';
import type { UseCase } from '@application/UseCase';

export class LoadSettingsUseCase implements UseCase<void, AppSettings> {
  constructor(private readonly settings: SettingsRepository) {}

  async execute(): Promise<Result<AppSettings>> {
    return this.settings.load();
  }
}

export type SettingsPatch = Partial<AppSettings>;

/**
 * Settings are not just stored — a reminder change has to reach the OS
 * scheduler. Keeping that in a use case stops the Settings screen from talking
 * to `expo-notifications` directly.
 */
export class UpdateSettingsUseCase implements UseCase<SettingsPatch, AppSettings> {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly reminders: ReminderScheduler,
    private readonly logger: Logger,
  ) {}

  async execute(patch: SettingsPatch): Promise<Result<AppSettings>> {
    const current = await this.settings.load();
    if (!current.ok) return current;

    const next: AppSettings = { ...DEFAULT_SETTINGS, ...current.value, ...patch };
    const saved = await this.settings.save(next);
    if (!saved.ok) return saved;

    const scheduled = next.reminderEnabled
      ? await this.reminders.schedule(next.reminder, 'Your tasks are waiting. Close out the day.')
      : await this.reminders.cancelAll();

    if (!scheduled.ok) {
      // A refused notification permission must not block the preference itself.
      this.logger.log('warn', 'Could not update the daily reminder.', {
        code: scheduled.error.code,
      });
    }

    return ok(next);
  }
}
