import { AppErrors } from '@core/errors/AppError';
import type { EventBus } from '@core/events/EventBus';
import { err, type Result } from '@core/result/Result';
import type { DomainEventMap } from '@domain/events/DomainEvents';
import { Challenges } from '@domain/challenge/Challenge';
import { DailyLogs } from '@domain/challenge/DailyLog';
import type { Clock } from '@domain/ports/Clock';
import type { ChallengeRepository, DailyLogRepository } from '@domain/ports/Repositories';
import type { TaskId, TaskInput } from '@domain/tasks/Task';
import { CalendarDates, type CalendarDate } from '@domain/value-objects/CalendarDate';
import type { UseCase } from '@application/UseCase';
import type { DashboardView } from '@application/dto/Views';
import type { ChallengeContextService } from '@application/services/ChallengeContextService';

export interface UpdateTaskProgressInput {
  readonly date: CalendarDate;
  readonly taskId: TaskId;
  readonly command: TaskInput;
}

/**
 * Applies one task command to one day and settles the consequences: the day's
 * status, the challenge's status on the final day, and the events other parts
 * of the app listen to.
 */
export class UpdateTaskProgressUseCase
  implements UseCase<UpdateTaskProgressInput, DashboardView>
{
  constructor(
    private readonly context: ChallengeContextService,
    private readonly challenges: ChallengeRepository,
    private readonly logs: DailyLogRepository,
    private readonly clock: Clock,
    private readonly events: EventBus<DomainEventMap>,
  ) {}

  async execute(input: UpdateTaskProgressInput): Promise<Result<DashboardView>> {
    const loaded = await this.context.require();
    if (!loaded.ok) return loaded;
    const context = loaded.value;

    if (context.challenge.status !== 'active') {
      return err(AppErrors.illegalState('This challenge is no longer active.'));
    }
    if (!CalendarDates.isSame(input.date, context.today)) {
      return err(
        AppErrors.validation('Only today can be edited — past days are locked on purpose.'),
      );
    }

    const found = await this.context.logFor(context, input.date);
    if (!found.ok) return found;

    const updated = DailyLogs.applyInput(found.value, {
      taskId: input.taskId,
      command: input.command,
      program: context.program,
      strategies: context.strategies,
      updatedAt: this.clock.nowIso(),
    });
    if (!updated.ok) return updated;

    const wasComplete = context.dayComplete.isSatisfiedBy(found.value);
    const isComplete = context.dayComplete.isSatisfiedBy(updated.value);
    const settled = DailyLogs.withStatus(
      updated.value,
      isComplete ? 'completed' : 'pending',
      this.clock.nowIso(),
    );

    const saved = await this.logs.save(settled);
    if (!saved.ok) return saved;

    const definition = context.program.tasks.find((task) => task.id === input.taskId);
    if (definition) {
      const strategy = context.strategies.resolve(definition.kind);
      this.events.publish('day/taskUpdated', {
        date: settled.date,
        taskId: definition.id,
        satisfied: strategy.isSatisfied(
          definition,
          DailyLogs.progressFor(settled, definition, context.strategies),
        ),
      });
    }

    let challengeContext = context;
    if (!wasComplete && isComplete) {
      this.events.publish('day/completed', {
        date: settled.date,
        dayNumber: settled.dayNumber,
      });

      // Finishing the final day finishes the challenge immediately, rather than
      // waiting for the next midnight rollover.
      const isFinalDay = settled.dayNumber >= context.program.durationDays;
      if (isFinalDay) {
        const completed = Challenges.complete(context.challenge, this.clock.nowIso());
        const persisted = await this.challenges.save(completed);
        if (!persisted.ok) return persisted;
        this.events.publish('challenge/completed', {
          challengeId: completed.id,
          totalDays: context.program.durationDays,
        });
        challengeContext = { ...context, challenge: completed };
      }
    }

    return this.context.assembleDashboard(challengeContext);
  }
}
