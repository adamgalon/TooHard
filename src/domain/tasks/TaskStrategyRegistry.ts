import type { TaskKind } from '@domain/tasks/Task';
import type { TaskStrategy } from '@domain/tasks/strategies/TaskStrategy';
import { CheckboxTaskStrategy } from '@domain/tasks/strategies/CheckboxTaskStrategy';
import { CounterTaskStrategy } from '@domain/tasks/strategies/CounterTaskStrategy';
import { PhotoTaskStrategy } from '@domain/tasks/strategies/PhotoTaskStrategy';

/**
 * Registry + factory for task strategies.
 *
 * `resolve` throws rather than returning a `Result`: a missing strategy is a
 * wiring bug at startup, not a runtime condition a user can recover from.
 */
export class TaskStrategyRegistry {
  private readonly strategies = new Map<TaskKind, TaskStrategy>();

  register(strategy: TaskStrategy): this {
    this.strategies.set(strategy.kind, strategy);
    return this;
  }

  resolve(kind: TaskKind): TaskStrategy {
    const strategy = this.strategies.get(kind);
    if (!strategy) throw new Error(`No task strategy registered for kind "${kind}".`);
    return strategy;
  }
}

export const createDefaultTaskStrategyRegistry = (): TaskStrategyRegistry =>
  new TaskStrategyRegistry()
    .register(new CheckboxTaskStrategy())
    .register(new CounterTaskStrategy())
    .register(new PhotoTaskStrategy());
