import { createContainer } from '@di/createContainer';
import { SilentLogger } from '@core/logger/Logger';
import { FixedClock } from '@domain/ports/Clock';
import { InMemoryKeyValueStore } from '@infrastructure/storage/InMemoryKeyValueStore';
import { SequentialIdGenerator } from '@infrastructure/system/RandomIdGenerator';
import { SilentHapticFeedback } from '@infrastructure/feedback/ExpoHapticFeedback';
import { NoopReminderScheduler } from '@infrastructure/notifications/ExpoReminderScheduler';

import { CLASSIC, completeToday, createHarness } from '../support/harness';

describe('persistence', () => {
  it('survives a cold start against the same store', async () => {
    const store = new InMemoryKeyValueStore();
    const clock = new FixedClock(new Date('2026-03-01T08:00:00Z'));
    const build = () =>
      createContainer({
        store,
        clock,
        logger: new SilentLogger(),
        ids: new SequentialIdGenerator(),
        haptics: new SilentHapticFeedback(),
        reminders: new NoopReminderScheduler(),
      });

    const first = build();
    await first.useCases.startChallenge.execute({ programId: CLASSIC });

    const second = build();
    const dashboard = await second.useCases.getDashboard.execute();
    expect(dashboard.ok && dashboard.value?.dayNumber).toBe(1);
  });

  it('reports corrupt data instead of crashing', async () => {
    const store = new InMemoryKeyValueStore();
    await store.write('challenge', JSON.stringify({ version: 1, data: { nonsense: true } }));

    const container = createContainer({
      store,
      logger: new SilentLogger(),
      haptics: new SilentHapticFeedback(),
      reminders: new NoopReminderScheduler(),
    });

    const dashboard = await container.useCases.getDashboard.execute();
    expect(dashboard.ok).toBe(false);
    expect(!dashboard.ok && dashboard.error.code).toBe('DATA_CORRUPTED');
  });

  it('clears the previous run when a new challenge starts', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });
    await completeToday(harness);
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });

    const dashboard = await harness.container.useCases.getDashboard.execute();
    expect(dashboard.ok && dashboard.value?.completedDays).toBe(0);
  });
});
