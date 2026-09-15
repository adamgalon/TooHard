import type { Result } from '@core/result/Result';
import type { TaskDefinition, TaskInput, TaskKind, TaskProgress } from '@domain/tasks/Task';

/**
 * Strategy pattern: one implementation per task kind.
 *
 * Adding a new kind of daily requirement (a timer, a GPS-verified run) means
 * writing one strategy and registering it — no `switch` in a screen, no change
 * to the aggregate.
 */
export interface TaskStrategy {
  readonly kind: TaskKind;
  /** Progress value for a freshly created day. */
  initial(definition: TaskDefinition): TaskProgress;
  /** Pure transition; rejects inputs that do not belong to this kind. */
  apply(
    definition: TaskDefinition,
    progress: TaskProgress,
    input: TaskInput,
  ): Result<TaskProgress>;
  isSatisfied(definition: TaskDefinition, progress: TaskProgress): boolean;
  /** 0…1, drives progress rings. */
  completionRatio(definition: TaskDefinition, progress: TaskProgress): number;
  /** Short human-readable state, e.g. `2.4 / 3.8 L`. */
  summarize(definition: TaskDefinition, progress: TaskProgress): string;
}
