import { AppErrors } from '@core/errors/AppError';
import { err, ok, type Result } from '@core/result/Result';
import type { TaskDefinition, TaskInput, TaskProgress } from '@domain/tasks/Task';
import type { TaskStrategy } from '@domain/tasks/strategies/TaskStrategy';

export class CheckboxTaskStrategy implements TaskStrategy {
  readonly kind = 'checkbox' as const;

  initial(): TaskProgress {
    return { kind: 'checkbox', completed: false };
  }

  apply(_definition: TaskDefinition, progress: TaskProgress, input: TaskInput): Result<TaskProgress> {
    if (progress.kind !== 'checkbox') {
      return err(AppErrors.illegalState('Checkbox strategy received non-checkbox progress.'));
    }
    switch (input.type) {
      case 'toggle':
        return ok({ kind: 'checkbox', completed: !progress.completed });
      case 'setChecked':
        return ok({ kind: 'checkbox', completed: input.completed });
      default:
        return err(AppErrors.validation(`A checkbox task cannot handle "${input.type}".`));
    }
  }

  isSatisfied(_definition: TaskDefinition, progress: TaskProgress): boolean {
    return progress.kind === 'checkbox' && progress.completed;
  }

  completionRatio(definition: TaskDefinition, progress: TaskProgress): number {
    return this.isSatisfied(definition, progress) ? 1 : 0;
  }

  summarize(definition: TaskDefinition, progress: TaskProgress): string {
    return this.isSatisfied(definition, progress) ? 'Done' : 'Not yet';
  }
}
