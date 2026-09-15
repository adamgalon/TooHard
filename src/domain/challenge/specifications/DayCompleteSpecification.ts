import type { Specification } from '@domain/shared/Specification';
import type { ChallengeProgram } from '@domain/challenge/ChallengeProgram';
import { DailyLogs, type DailyLog } from '@domain/challenge/DailyLog';
import type { TaskStrategyRegistry } from '@domain/tasks/TaskStrategyRegistry';

/** A day counts only when every *required* task of the programme is satisfied. */
export class DayCompleteSpecification implements Specification<DailyLog> {
  constructor(
    private readonly program: ChallengeProgram,
    private readonly strategies: TaskStrategyRegistry,
  ) {}

  readonly description = 'every required task of the day is satisfied';

  isSatisfiedBy(log: DailyLog): boolean {
    return this.program.tasks
      .filter((definition) => definition.required)
      .every((definition) =>
        this.strategies
          .resolve(definition.kind)
          .isSatisfied(definition, DailyLogs.progressFor(log, definition, this.strategies)),
      );
  }
}
