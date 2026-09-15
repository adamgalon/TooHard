import { AppErrors } from '@core/errors/AppError';
import { err, ok, type Result } from '@core/result/Result';
import { Challenges, type Challenge } from '@domain/challenge/Challenge';
import { ChallengePrograms, type ChallengeProgram } from '@domain/challenge/ChallengeProgram';
import { DailyLogs, type DailyLog } from '@domain/challenge/DailyLog';
import { DayCompleteSpecification } from '@domain/challenge/specifications/DayCompleteSpecification';
import type { FailurePolicy, FailurePolicyRegistry } from '@domain/challenge/policies/FailurePolicy';
import type { Clock } from '@domain/ports/Clock';
import type { ChallengeRepository, DailyLogRepository } from '@domain/ports/Repositories';
import type { TaskStrategyRegistry } from '@domain/tasks/TaskStrategyRegistry';
import { CalendarDates, type CalendarDate } from '@domain/value-objects/CalendarDate';
import type { DashboardView } from '@application/dto/Views';
import { toDashboardView } from '@application/dto/ViewMapper';

/**
 * Everything a use case needs to reason about the current run, loaded once.
 */
export interface ChallengeContext {
  readonly challenge: Challenge;
  readonly program: ChallengeProgram;
  readonly policy: FailurePolicy;
  readonly dayComplete: DayCompleteSpecification;
  readonly strategies: TaskStrategyRegistry;
  readonly today: CalendarDate;
}

/**
 * Application service shared by the use cases: assembling a context is not a
 * user intention, so it does not deserve a use case of its own — but four use
 * cases needing the same six lines does deserve one collaborator.
 */
export class ChallengeContextService {
  constructor(
    private readonly challenges: ChallengeRepository,
    private readonly logs: DailyLogRepository,
    private readonly strategies: TaskStrategyRegistry,
    private readonly policies: FailurePolicyRegistry,
    private readonly clock: Clock,
  ) {}

  /** `null` when the user has not started a challenge yet. */
  async load(): Promise<Result<ChallengeContext | null>> {
    const found = await this.challenges.find();
    if (!found.ok) return found;
    if (found.value === null) return ok(null);
    return ok(this.contextFor(found.value));
  }

  async require(): Promise<Result<ChallengeContext>> {
    const context = await this.load();
    if (!context.ok) return context;
    if (context.value === null) return err(AppErrors.notFound('No challenge has been started.'));
    return ok(context.value);
  }

  contextFor(challenge: Challenge): ChallengeContext {
    const program = ChallengePrograms.resolve(challenge.programId);
    return {
      challenge,
      program,
      policy: this.policies.resolve(program.failurePolicyId),
      dayComplete: new DayCompleteSpecification(program, this.strategies),
      strategies: this.strategies,
      today: this.clock.today(),
    };
  }

  /** Reads the log for a date, creating (but not persisting) it when absent. */
  async logFor(context: ChallengeContext, date: CalendarDate): Promise<Result<DailyLog>> {
    const existing = await this.logs.findByDate({
      challengeId: context.challenge.id,
      attempt: context.challenge.attempt,
      date,
    });
    if (!existing.ok) return existing;
    if (existing.value) return ok(existing.value);

    const dayNumber = Challenges.dayNumberFor(context.challenge, date);
    if (dayNumber < 1 || dayNumber > context.program.durationDays) {
      return err(
        AppErrors.validation(`${date} is outside attempt ${context.challenge.attempt}.`),
      );
    }
    return ok(
      DailyLogs.create({
        challengeId: context.challenge.id,
        attempt: context.challenge.attempt,
        date,
        dayNumber,
        program: context.program,
        strategies: this.strategies,
        updatedAt: this.clock.nowIso(),
      }),
    );
  }

  /**
   * Builds the read model for today in one place, so every command can answer
   * with fresh state instead of asking the caller to re-query.
   */
  async assembleDashboard(context: ChallengeContext): Promise<Result<DashboardView>> {
    // Clamp to the attempt window: before the start date we show day 1, and
    // after a finished run we keep showing the final day rather than failing.
    const lastDate = Challenges.lastDate(context.challenge, context.program.durationDays);
    const anchor = CalendarDates.isBefore(context.today, context.challenge.startDate)
      ? context.challenge.startDate
      : CalendarDates.isAfter(context.today, lastDate)
        ? lastDate
        : context.today;
    const todayLog = await this.logFor(context, anchor);
    if (!todayLog.ok) return todayLog;

    const attemptLogs = await this.logs.listForAttempt({
      challengeId: context.challenge.id,
      attempt: context.challenge.attempt,
    });
    if (!attemptLogs.ok) return attemptLogs;

    return ok(toDashboardView(context, todayLog.value, attemptLogs.value));
  }

  /** Every date of the attempt that has already begun, oldest first. */
  elapsedDates(context: ChallengeContext): CalendarDate[] {
    const lastDate = Challenges.lastDate(context.challenge, context.program.durationDays);
    const until = CalendarDates.isBefore(context.today, lastDate) ? context.today : lastDate;
    if (CalendarDates.isBefore(until, context.challenge.startDate)) return [];
    return CalendarDates.range(context.challenge.startDate, until);
  }
}
