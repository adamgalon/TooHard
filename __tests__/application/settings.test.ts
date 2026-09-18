import { err, ok, type Result } from '@core/result/Result';
import { AppErrors } from '@core/errors/AppError';
import { SilentLogger } from '@core/logger/Logger';
import { DEFAULT_SETTINGS } from '@domain/settings/AppSettings';
import type { DailyReminder, ReminderScheduler } from '@domain/ports/Services';
import { createContainer } from '@di/createContainer';
import { FixedClock } from '@domain/ports/Clock';
import { InMemoryKeyValueStore } from '@infrastructure/storage/InMemoryKeyValueStore';
import { SilentHapticFeedback } from '@infrastructure/feedback/ExpoHapticFeedback';
import { SequentialIdGenerator } from '@infrastructure/system/RandomIdGenerator';

type Call =
  | { readonly kind: 'schedule'; readonly reminder: DailyReminder; readonly body: string }
  | { readonly kind: 'cancelAll' };

/** Records every call instead of just no-opping, so the use case's OS-facing behaviour is observable. */
class RecordingReminderScheduler implements ReminderScheduler {
  readonly calls: Call[] = [];
  private nextResult: Result<void> = ok(undefined);

  async schedule(reminder: DailyReminder, body: string): Promise<Result<void>> {
    this.calls.push({ kind: 'schedule', reminder, body });
    return this.nextResult;
  }

  async cancelAll(): Promise<Result<void>> {
    this.calls.push({ kind: 'cancelAll' });
    return this.nextResult;
  }

  denyNextPermission(): void {
    this.nextResult = err(AppErrors.permissionDenied('Notifications refused.'));
  }
}

const buildContainer = (reminders: ReminderScheduler) =>
  createContainer({
    store: new InMemoryKeyValueStore(),
    clock: new FixedClock(new Date('2026-01-01T09:00:00Z')),
    logger: new SilentLogger(),
    ids: new SequentialIdGenerator(),
    haptics: new SilentHapticFeedback(),
    reminders,
  });

describe('LoadSettingsUseCase', () => {
  it('returns the defaults before anything has been saved', async () => {
    const container = buildContainer(new RecordingReminderScheduler());
    const loaded = await container.useCases.loadSettings.execute();
    expect(loaded.ok && loaded.value).toEqual(DEFAULT_SETTINGS);
  });
});

describe('UpdateSettingsUseCase', () => {
  it('schedules a reminder once it is turned on', async () => {
    const reminders = new RecordingReminderScheduler();
    const container = buildContainer(reminders);

    const updated = await container.useCases.updateSettings.execute({
      reminderEnabled: true,
      reminder: { hour: 21, minute: 30 },
    });

    expect(updated.ok && updated.value.reminderEnabled).toBe(true);
    expect(reminders.calls).toEqual([
      { kind: 'schedule', reminder: { hour: 21, minute: 30 }, body: expect.any(String) },
    ]);
  });

  it('cancels the reminder once it is turned off', async () => {
    const reminders = new RecordingReminderScheduler();
    const container = buildContainer(reminders);

    await container.useCases.updateSettings.execute({ reminderEnabled: true });
    reminders.calls.length = 0;
    await container.useCases.updateSettings.execute({ reminderEnabled: false });

    expect(reminders.calls).toEqual([{ kind: 'cancelAll' }]);
  });

  it('persists the preference even when the OS refuses the notification permission', async () => {
    const reminders = new RecordingReminderScheduler();
    reminders.denyNextPermission();
    const container = buildContainer(reminders);

    const updated = await container.useCases.updateSettings.execute({ reminderEnabled: true });

    expect(updated.ok && updated.value.reminderEnabled).toBe(true);
    const reloaded = await container.useCases.loadSettings.execute();
    expect(reloaded.ok && reloaded.value.reminderEnabled).toBe(true);
  });

  it('merges a partial patch onto the existing settings rather than replacing them', async () => {
    const container = buildContainer(new RecordingReminderScheduler());

    await container.useCases.updateSettings.execute({ hapticsEnabled: false });
    const updated = await container.useCases.updateSettings.execute({ themePreference: 'dark' });

    expect(updated.ok && updated.value).toMatchObject({
      hapticsEnabled: false,
      themePreference: 'dark',
    });
  });
});
