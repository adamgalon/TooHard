import { ok, type Result } from '@core/result/Result';
import { computeStatistics, type ChallengeStatistics } from '@domain/challenge/ChallengeStatistics';
import type { AttemptSummary } from '@domain/challenge/Challenge';
import type { DailyLogRepository } from '@domain/ports/Repositories';
import type { UseCase } from '@application/UseCase';
import type { ChallengeContextService } from '@application/services/ChallengeContextService';

export interface StatisticsView {
  readonly programName: string;
  readonly attempt: number;
  readonly totalDays: number;
  readonly statistics: ChallengeStatistics;
  readonly previousAttempts: readonly AttemptSummary[];
}

export class GetStatisticsUseCase implements UseCase<void, StatisticsView | null> {
  constructor(
    private readonly context: ChallengeContextService,
    private readonly logs: DailyLogRepository,
  ) {}

  async execute(): Promise<Result<StatisticsView | null>> {
    const loaded = await this.context.load();
    if (!loaded.ok) return loaded;
    if (loaded.value === null) return ok(null);
    const context = loaded.value;

    const stored = await this.logs.listForAttempt({
      challengeId: context.challenge.id,
      attempt: context.challenge.attempt,
    });
    if (!stored.ok) return stored;

    return ok({
      programName: context.program.name,
      attempt: context.challenge.attempt,
      totalDays: context.program.durationDays,
      statistics: computeStatistics({
        logs: stored.value,
        program: context.program,
        strategies: context.strategies,
      }),
      previousAttempts: context.challenge.previousAttempts,
    });
  }
}
