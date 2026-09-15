import { AppErrors } from '@core/errors/AppError';
import { err, ok, type Result } from '@core/result/Result';
import type { TaskDefinition, TaskInput, TaskProgress } from '@domain/tasks/Task';
import type { TaskStrategy } from '@domain/tasks/strategies/TaskStrategy';

export class PhotoTaskStrategy implements TaskStrategy {
  readonly kind = 'photo' as const;

  initial(): TaskProgress {
    return { kind: 'photo', photoUri: null, capturedAt: null };
  }

  apply(_definition: TaskDefinition, progress: TaskProgress, input: TaskInput): Result<TaskProgress> {
    if (progress.kind !== 'photo') {
      return err(AppErrors.illegalState('Photo strategy received non-photo progress.'));
    }
    switch (input.type) {
      case 'attachPhoto':
        if (input.photoUri.trim().length === 0) {
          return err(AppErrors.validation('A progress photo needs a location on disk.'));
        }
        return ok({ kind: 'photo', photoUri: input.photoUri, capturedAt: input.capturedAt });
      case 'clearPhoto':
        return ok({ kind: 'photo', photoUri: null, capturedAt: null });
      default:
        return err(AppErrors.validation(`A photo task cannot handle "${input.type}".`));
    }
  }

  isSatisfied(_definition: TaskDefinition, progress: TaskProgress): boolean {
    return progress.kind === 'photo' && progress.photoUri !== null;
  }

  completionRatio(definition: TaskDefinition, progress: TaskProgress): number {
    return this.isSatisfied(definition, progress) ? 1 : 0;
  }

  summarize(definition: TaskDefinition, progress: TaskProgress): string {
    return this.isSatisfied(definition, progress) ? 'Captured' : 'No photo yet';
  }
}
