import { ok, type Result } from '@core/result/Result';
import { SilentLogger } from '@core/logger/Logger';
import type { WidgetSnapshot, WidgetSync } from '@domain/ports/Services';
import { createContainer } from '@di/createContainer';
import { FixedClock } from '@domain/ports/Clock';
import { InMemoryKeyValueStore } from '@infrastructure/storage/InMemoryKeyValueStore';
import { SilentHapticFeedback } from '@infrastructure/feedback/ExpoHapticFeedback';
import { SequentialIdGenerator } from '@infrastructure/system/RandomIdGenerator';

import { CLASSIC } from '../support/harness';

/** Records every push to the widget instead of talking to a native module. */
class RecordingWidgetSync implements WidgetSync {
  readonly calls: (WidgetSnapshot | null)[] = [];

  async updateSnapshot(snapshot: WidgetSnapshot | null): Promise<Result<void>> {
    this.calls.push(snapshot);
    return ok(undefined);
  }
}

/** Lets every pending microtask (including `syncWidget`'s own awaits) settle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const buildContainer = (widgetSync: WidgetSync) =>
  createContainer({
    store: new InMemoryKeyValueStore(),
    clock: new FixedClock(new Date('2026-01-01T09:00:00Z')),
    logger: new SilentLogger(),
    ids: new SequentialIdGenerator(),
    haptics: new SilentHapticFeedback(),
    widgetSync,
  });

describe('widget sync', () => {
  it('pushes a snapshot when a challenge starts', async () => {
    const widgetSync = new RecordingWidgetSync();
    const container = buildContainer(widgetSync);

    await container.useCases.startChallenge.execute({ programId: CLASSIC });
    await flush();

    expect(widgetSync.calls.at(-1)).toMatchObject({
      dayNumber: 1,
      totalDays: 75,
      currentStreak: 0,
      completedDays: 0,
      daysRemaining: 75,
      ratio: 0,
    });
    // The widget renders today's tasks as a checklist, so they travel with
    // the snapshot rather than being re-derived inside the widget bundle.
    expect(widgetSync.calls.at(-1)?.tasks).toHaveLength(6);
    expect(widgetSync.calls.at(-1)?.tasks.every((task) => !task.satisfied)).toBe(true);
    expect(widgetSync.calls.at(-1)?.tasks[0]).toEqual({
      emoji: '🥗',
      title: 'Follow your diet',
      satisfied: false,
    });
  });

  it('pushes an updated snapshot after a task is completed', async () => {
    const widgetSync = new RecordingWidgetSync();
    const container = buildContainer(widgetSync);

    await container.useCases.startChallenge.execute({ programId: CLASSIC });
    await flush();
    widgetSync.calls.length = 0;

    const dashboard = await container.useCases.getDashboard.execute();
    if (!dashboard.ok || !dashboard.value) throw new Error('expected a dashboard');
    const task = dashboard.value.today.tasks[0];
    if (!task) throw new Error('expected a task');

    await container.useCases.updateTaskProgress.execute({
      date: dashboard.value.today.date,
      taskId: task.id,
      command: { type: 'toggle' },
    });
    await flush();

    expect(widgetSync.calls.length).toBeGreaterThan(0);
    expect(widgetSync.calls.at(-1)?.ratio).toBeGreaterThan(0);
    expect(widgetSync.calls.at(-1)?.tasks.filter((entry) => entry.satisfied)).toHaveLength(1);
  });

  it('clears the widget when the challenge ends', async () => {
    const widgetSync = new RecordingWidgetSync();
    const container = buildContainer(widgetSync);

    await container.useCases.startChallenge.execute({ programId: CLASSIC });
    await flush();

    await container.useCases.endChallenge.execute();
    await flush();

    expect(widgetSync.calls.at(-1)).toBeNull();
  });

  it('clears the widget on a cold start with no challenge yet', async () => {
    const widgetSync = new RecordingWidgetSync();
    buildContainer(widgetSync);

    await flush();

    expect(widgetSync.calls).toEqual([null]);
  });
});
