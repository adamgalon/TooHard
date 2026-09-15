import { AppErrors } from '@core/errors/AppError';
import { err, ok, type Result } from '@core/result/Result';
import type { TaskDefinition, TaskInput, TaskProgress } from '@domain/tasks/Task';
import type { TaskStrategy } from '@domain/tasks/strategies/TaskStrategy';

const round = (value: number): number => Math.round(value * 100) / 100;

export class CounterTaskStrategy implements TaskStrategy {
  readonly kind = 'counter' as const;

  initial(): TaskProgress {
    return { kind: 'counter', amount: 0 };
  }

  apply(definition: TaskDefinition, progress: TaskProgress, input: TaskInput): Result<TaskProgress> {
    if (definition.kind !== 'counter' || progress.kind !== 'counter') {
      return err(AppErrors.illegalState('Counter strategy received a mismatched task.'));
    }
    // Overshooting is allowed (people drink more than a gallon); going below
    // zero is not, so the counter never renders a negative ring.
    const clamp = (value: number): number => Math.max(0, round(value));

    switch (input.type) {
      case 'increment':
        return ok({ kind: 'counter', amount: clamp(progress.amount + (input.amount ?? definition.step)) });
      case 'decrement':
        return ok({ kind: 'counter', amount: clamp(progress.amount - (input.amount ?? definition.step)) });
      case 'setAmount':
        if (!Number.isFinite(input.amount)) {
          return err(AppErrors.validation('Amount must be a finite number.'));
        }
        return ok({ kind: 'counter', amount: clamp(input.amount) });
      default:
        return err(AppErrors.validation(`A counter task cannot handle "${input.type}".`));
    }
  }

  isSatisfied(definition: TaskDefinition, progress: TaskProgress): boolean {
    if (definition.kind !== 'counter' || progress.kind !== 'counter') return false;
    return progress.amount >= definition.target;
  }

  completionRatio(definition: TaskDefinition, progress: TaskProgress): number {
    if (definition.kind !== 'counter' || progress.kind !== 'counter') return 0;
    if (definition.target <= 0) return 1;
    return Math.min(1, progress.amount / definition.target);
  }

  summarize(definition: TaskDefinition, progress: TaskProgress): string {
    if (definition.kind !== 'counter' || progress.kind !== 'counter') return '';
    return `${round(progress.amount)} / ${definition.target} ${definition.unit}`;
  }
}
