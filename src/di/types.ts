import type { EventBus } from '@core/events/EventBus';
import type { Logger } from '@core/logger/Logger';
import type { DomainEventMap } from '@domain/events/DomainEvents';
import type { Clock } from '@domain/ports/Clock';
import type { HapticFeedback } from '@domain/ports/Services';
import type { Cell } from '@di/Cell';
import type { StartChallengeUseCase } from '@application/use-cases/StartChallenge';
import type { SynchronizeChallengeUseCase } from '@application/use-cases/SynchronizeChallenge';
import type { GetDashboardUseCase } from '@application/use-cases/GetDashboard';
import type { UpdateTaskProgressUseCase } from '@application/use-cases/UpdateTaskProgress';
import type { SetDayNoteUseCase } from '@application/use-cases/SetDayNote';
import type { CaptureProgressPhotoUseCase } from '@application/use-cases/CaptureProgressPhoto';
import type { GetCalendarUseCase } from '@application/use-cases/GetCalendar';
import type { GetStatisticsUseCase } from '@application/use-cases/GetStatistics';
import type { EndChallengeUseCase } from '@application/use-cases/EndChallenge';
import type { LoadSettingsUseCase, UpdateSettingsUseCase } from '@application/use-cases/ManageSettings';
import type { BackupDataUseCase } from '@application/use-cases/BackupData';
import type { RestoreDataUseCase } from '@application/use-cases/RestoreData';
import type { GetPhotoTimelineUseCase } from '@application/use-cases/GetPhotoTimeline';

/**
 * Everything the presentation layer is allowed to reach for. Screens receive
 * use cases, never repositories — so no component can accidentally become a
 * second place where business rules live.
 */
export interface UseCases {
  readonly startChallenge: StartChallengeUseCase;
  readonly synchronize: SynchronizeChallengeUseCase;
  readonly getDashboard: GetDashboardUseCase;
  readonly updateTaskProgress: UpdateTaskProgressUseCase;
  readonly setDayNote: SetDayNoteUseCase;
  readonly captureProgressPhoto: CaptureProgressPhotoUseCase;
  readonly getCalendar: GetCalendarUseCase;
  readonly getStatistics: GetStatisticsUseCase;
  readonly endChallenge: EndChallengeUseCase;
  readonly loadSettings: LoadSettingsUseCase;
  readonly updateSettings: UpdateSettingsUseCase;
  readonly backupData: BackupDataUseCase;
  readonly restoreData: RestoreDataUseCase;
  readonly getPhotoTimeline: GetPhotoTimelineUseCase;
}

export interface AppContainer {
  readonly useCases: UseCases;
  readonly clock: Clock;
  readonly logger: Logger;
  readonly events: EventBus<DomainEventMap>;
  readonly haptics: HapticFeedback;
  /** Live preference flags shared with adapters (haptics on/off). */
  readonly preferences: { readonly hapticsEnabled: Cell<boolean> };
  readonly dispose: () => void;
}
