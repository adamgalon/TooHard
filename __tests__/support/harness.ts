import { InMemoryEventBus } from '@core/events/EventBus';
import { SilentLogger } from '@core/logger/Logger';
import type { DomainEventMap } from '@domain/events/DomainEvents';
import { FixedClock } from '@domain/ports/Clock';
import { PROGRAM_IDS } from '@domain/challenge/ChallengeProgram';
import type { CapturedPhoto, PhotoCapture, PhotoSource } from '@domain/ports/Services';
import { ok, type Result } from '@core/result/Result';
import { createContainer } from '@di/createContainer';
import type { AppContainer } from '@di/types';
import { SilentHapticFeedback } from '@infrastructure/feedback/ExpoHapticFeedback';
import { PassThroughPhotoStorage } from '@infrastructure/media/ExpoPhotoStorage';
import { NoopReminderScheduler } from '@infrastructure/notifications/ExpoReminderScheduler';
import { InMemoryKeyValueStore } from '@infrastructure/storage/InMemoryKeyValueStore';
import { SequentialIdGenerator } from '@infrastructure/system/RandomIdGenerator';

export class StubPhotoCapture implements PhotoCapture {
  constructor(private readonly photo: CapturedPhoto | null = { uri: 'file://photo.jpg', width: 1, height: 1 }) {}

  async capture(_source: PhotoSource): Promise<Result<CapturedPhoto | null>> {
    return ok(this.photo);
  }
}

export interface Harness {
  readonly container: AppContainer;
  readonly clock: FixedClock;
  readonly events: InMemoryEventBus<DomainEventMap>;
}

/**
 * A fully wired app with every port replaced by an in-memory double. Use cases
 * are exercised exactly as the UI would, but the suite stays deterministic.
 */
export const createHarness = (startingAt = new Date('2026-01-01T09:00:00Z')): Harness => {
  const clock = new FixedClock(startingAt);
  const events = new InMemoryEventBus<DomainEventMap>();

  const container = createContainer({
    store: new InMemoryKeyValueStore(),
    clock,
    events,
    logger: new SilentLogger(),
    ids: new SequentialIdGenerator('challenge'),
    haptics: new SilentHapticFeedback(),
    photoCapture: new StubPhotoCapture(),
    photoStorage: new PassThroughPhotoStorage(),
    reminders: new NoopReminderScheduler(),
  });

  return { container, clock, events };
};

export const CLASSIC = PROGRAM_IDS.classic;
export const SOFT = PROGRAM_IDS.soft;

/** Completes every required task of the given day. */
export const completeToday = async (harness: Harness): Promise<void> => {
  const dashboard = await harness.container.useCases.getDashboard.execute();
  if (!dashboard.ok || !dashboard.value) throw new Error('No challenge to complete.');

  for (const task of dashboard.value.today.tasks) {
    const date = dashboard.value.today.date;
    if (task.kind === 'checkbox') {
      await harness.container.useCases.updateTaskProgress.execute({
        date,
        taskId: task.id,
        command: { type: 'setChecked', completed: true },
      });
    } else if (task.kind === 'counter') {
      await harness.container.useCases.updateTaskProgress.execute({
        date,
        taskId: task.id,
        command: { type: 'setAmount', amount: task.target ?? 0 },
      });
    } else {
      await harness.container.useCases.updateTaskProgress.execute({
        date,
        taskId: task.id,
        command: {
          type: 'attachPhoto',
          photoUri: `file://day-${task.id}.jpg`,
          capturedAt: harness.clock.nowIso(),
        },
      });
    }
  }
};
