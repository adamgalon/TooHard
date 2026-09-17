import { Platform } from 'react-native';

import { InMemoryEventBus, type EventBus } from '@core/events/EventBus';
import { ConsoleLogger, type Logger } from '@core/logger/Logger';
import type { Unsubscribe } from '@core/types/Brand';
import type { DomainEventMap } from '@domain/events/DomainEvents';
import { createDefaultFailurePolicyRegistry } from '@domain/challenge/policies/FailurePolicy';
import { SystemClock, type Clock } from '@domain/ports/Clock';
import type {
  ChallengeRepository,
  DailyLogRepository,
  SettingsRepository,
} from '@domain/ports/Repositories';
import type {
  BackupIO,
  HapticFeedback,
  PhotoCapture,
  PhotoStorage,
  ReminderScheduler,
} from '@domain/ports/Services';
import type { IdGenerator } from '@domain/shared/Identifier';
import { createDefaultTaskStrategyRegistry } from '@domain/tasks/TaskStrategyRegistry';
import { ChallengeContextService } from '@application/services/ChallengeContextService';
import { StartChallengeUseCase } from '@application/use-cases/StartChallenge';
import { SynchronizeChallengeUseCase } from '@application/use-cases/SynchronizeChallenge';
import { GetDashboardUseCase } from '@application/use-cases/GetDashboard';
import { UpdateTaskProgressUseCase } from '@application/use-cases/UpdateTaskProgress';
import { SetDayNoteUseCase } from '@application/use-cases/SetDayNote';
import { CaptureProgressPhotoUseCase } from '@application/use-cases/CaptureProgressPhoto';
import { GetCalendarUseCase } from '@application/use-cases/GetCalendar';
import { GetStatisticsUseCase } from '@application/use-cases/GetStatistics';
import { EndChallengeUseCase } from '@application/use-cases/EndChallenge';
import { LoadSettingsUseCase, UpdateSettingsUseCase } from '@application/use-cases/ManageSettings';
import { BackupDataUseCase } from '@application/use-cases/BackupData';
import { RestoreDataUseCase } from '@application/use-cases/RestoreData';
import { GetPhotoTimelineUseCase } from '@application/use-cases/GetPhotoTimeline';
import { AsyncStorageKeyValueStore } from '@infrastructure/storage/AsyncStorageKeyValueStore';
import type { KeyValueStore } from '@infrastructure/storage/KeyValueStore';
import { PersistentChallengeRepository } from '@infrastructure/persistence/PersistentChallengeRepository';
import { PersistentDailyLogRepository } from '@infrastructure/persistence/PersistentDailyLogRepository';
import { PersistentSettingsRepository } from '@infrastructure/persistence/PersistentSettingsRepository';
import { ExpoPhotoCapture } from '@infrastructure/media/ExpoPhotoCapture';
import { ExpoPhotoStorage, PassThroughPhotoStorage } from '@infrastructure/media/ExpoPhotoStorage';
import {
  ExpoReminderScheduler,
  NoopReminderScheduler,
} from '@infrastructure/notifications/ExpoReminderScheduler';
import { ExpoHapticFeedback } from '@infrastructure/feedback/ExpoHapticFeedback';
import { ExpoBackupIO, NoopBackupIO } from '@infrastructure/backup/ExpoBackupIO';
import { RandomIdGenerator } from '@infrastructure/system/RandomIdGenerator';
import { Cell } from '@di/Cell';
import type { AppContainer } from '@di/types';

/**
 * Every port can be replaced. Tests build a container with in-memory doubles
 * and a fixed clock; the app uses the defaults below.
 */
export interface ContainerOverrides {
  store?: KeyValueStore;
  clock?: Clock;
  logger?: Logger;
  events?: EventBus<DomainEventMap>;
  ids?: IdGenerator;
  haptics?: HapticFeedback;
  photoCapture?: PhotoCapture;
  photoStorage?: PhotoStorage;
  reminders?: ReminderScheduler;
  backupIO?: BackupIO;
  challenges?: ChallengeRepository;
  logs?: DailyLogRepository;
  settings?: SettingsRepository;
}

/**
 * Composition root — the single place that knows every concrete class.
 *
 * Constructor injection everywhere else means no module ever imports a
 * singleton, so nothing needs resetting between tests.
 */
export const createContainer = (overrides: ContainerOverrides = {}): AppContainer => {
  const isWeb = Platform.OS === 'web';

  const store = overrides.store ?? new AsyncStorageKeyValueStore();
  const clock = overrides.clock ?? new SystemClock();
  const logger = overrides.logger ?? new ConsoleLogger();
  const events = overrides.events ?? new InMemoryEventBus<DomainEventMap>();
  const ids = overrides.ids ?? new RandomIdGenerator();

  const hapticsEnabled = new Cell(true);
  const haptics = overrides.haptics ?? new ExpoHapticFeedback(() => hapticsEnabled.get());

  const challenges = overrides.challenges ?? new PersistentChallengeRepository(store);
  const logs = overrides.logs ?? new PersistentDailyLogRepository(store);
  const settings = overrides.settings ?? new PersistentSettingsRepository(store);

  const photoCapture = overrides.photoCapture ?? new ExpoPhotoCapture();
  const photoStorage =
    overrides.photoStorage ?? (isWeb ? new PassThroughPhotoStorage() : new ExpoPhotoStorage());
  const reminders =
    overrides.reminders ?? (isWeb ? new NoopReminderScheduler() : new ExpoReminderScheduler());
  const backupIO = overrides.backupIO ?? (isWeb ? new NoopBackupIO() : new ExpoBackupIO());

  const strategies = createDefaultTaskStrategyRegistry();
  const policies = createDefaultFailurePolicyRegistry();
  const context = new ChallengeContextService(challenges, logs, strategies, policies, clock);

  const updateTaskProgress = new UpdateTaskProgressUseCase(
    context,
    challenges,
    logs,
    clock,
    events,
  );

  const subscriptions: Unsubscribe[] = [
    // Observer wiring: feedback reacts to facts instead of being called from
    // inside the use cases.
    events.subscribe('day/completed', () => haptics.trigger('success')),
    events.subscribe('challenge/completed', () => haptics.trigger('success')),
    events.subscribe('challenge/restarted', () => haptics.trigger('error')),
    events.subscribe('day/taskUpdated', ({ satisfied }) =>
      haptics.trigger(satisfied ? 'impact' : 'selection'),
    ),
  ];

  if (__DEV__) {
    const observed: (keyof DomainEventMap)[] = [
      'challenge/started',
      'challenge/restarted',
      'challenge/completed',
      'day/completed',
      'day/missed',
    ];
    for (const name of observed) {
      subscriptions.push(
        events.subscribe(name, (payload) =>
          logger.log('debug', `event ${String(name)}`, { payload }),
        ),
      );
    }
  }

  return {
    clock,
    logger,
    events,
    haptics,
    preferences: { hapticsEnabled },
    useCases: {
      startChallenge: new StartChallengeUseCase(challenges, logs, ids, clock, events),
      synchronize: new SynchronizeChallengeUseCase(context, challenges, logs, clock, events),
      getDashboard: new GetDashboardUseCase(context),
      updateTaskProgress,
      setDayNote: new SetDayNoteUseCase(context, logs, clock),
      captureProgressPhoto: new CaptureProgressPhotoUseCase(
        photoCapture,
        photoStorage,
        updateTaskProgress,
        clock,
      ),
      getCalendar: new GetCalendarUseCase(context, logs),
      getStatistics: new GetStatisticsUseCase(context, logs),
      endChallenge: new EndChallengeUseCase(context, challenges, logs, events),
      loadSettings: new LoadSettingsUseCase(settings),
      updateSettings: new UpdateSettingsUseCase(settings, reminders, logger),
      backupData: new BackupDataUseCase(challenges, logs, settings, backupIO, clock),
      restoreData: new RestoreDataUseCase(challenges, logs, settings, backupIO),
      getPhotoTimeline: new GetPhotoTimelineUseCase(context, logs),
    },
    dispose: () => subscriptions.forEach((unsubscribe) => unsubscribe()),
  };
};
