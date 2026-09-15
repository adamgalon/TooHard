import { ok, type Result } from '@core/result/Result';
import type { Clock } from '@domain/ports/Clock';
import type { PhotoCapture, PhotoSource, PhotoStorage } from '@domain/ports/Services';
import { TaskIds, type TaskId } from '@domain/tasks/Task';
import type { CalendarDate } from '@domain/value-objects/CalendarDate';
import type { UseCase } from '@application/UseCase';
import type { DashboardView } from '@application/dto/Views';
import type { UpdateTaskProgressUseCase } from '@application/use-cases/UpdateTaskProgress';

export interface CaptureProgressPhotoInput {
  readonly date: CalendarDate;
  readonly source: PhotoSource;
  readonly taskId?: TaskId;
}

/**
 * Composes two ports and one use case: pick a photo, copy it somewhere durable,
 * then record it as task progress. The picker's temporary cache URI never
 * reaches the domain.
 */
export class CaptureProgressPhotoUseCase
  implements UseCase<CaptureProgressPhotoInput, DashboardView | null>
{
  private static readonly DEFAULT_TASK = TaskIds.unsafe('progress-photo');

  constructor(
    private readonly capture: PhotoCapture,
    private readonly storage: PhotoStorage,
    private readonly updateTask: UpdateTaskProgressUseCase,
    private readonly clock: Clock,
  ) {}

  /** Resolves to `null` when the user backed out of the picker. */
  async execute(input: CaptureProgressPhotoInput): Promise<Result<DashboardView | null>> {
    const picked = await this.capture.capture(input.source);
    if (!picked.ok) return picked;
    if (picked.value === null) return ok(null);

    const fileName = `progress-${input.date}-${this.clock.now().getTime()}.jpg`;
    const stored = await this.storage.persist(picked.value.uri, fileName);
    if (!stored.ok) return stored;

    const updated = await this.updateTask.execute({
      date: input.date,
      taskId: input.taskId ?? CaptureProgressPhotoUseCase.DEFAULT_TASK,
      command: {
        type: 'attachPhoto',
        photoUri: stored.value,
        capturedAt: this.clock.nowIso(),
      },
    });
    if (!updated.ok) {
      // Do not leave an orphaned file behind if the day refused the update.
      await this.storage.remove(stored.value);
      return updated;
    }
    return ok(updated.value);
  }
}

