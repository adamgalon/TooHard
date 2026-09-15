import type { EventBus } from '@core/events/EventBus';
import { ok, type Result } from '@core/result/Result';
import type { DomainEventMap } from '@domain/events/DomainEvents';
import type { ChallengeRepository, DailyLogRepository } from '@domain/ports/Repositories';
import type { UseCase } from '@application/UseCase';
import type { ChallengeContextService } from '@application/services/ChallengeContextService';

/**
 * Quitting the current run. Logs are wiped along with it: a challenge the user
 * walked away from should not haunt the next attempt's statistics.
 */
export class EndChallengeUseCase implements UseCase<void, void> {
  constructor(
    private readonly context: ChallengeContextService,
    private readonly challenges: ChallengeRepository,
    private readonly logs: DailyLogRepository,
    private readonly events: EventBus<DomainEventMap>,
  ) {}

  async execute(): Promise<Result<void>> {
    const loaded = await this.context.load();
    if (!loaded.ok) return loaded;
    if (loaded.value === null) return ok(undefined);
    const context = loaded.value;

    const cleared = await this.logs.clear();
    if (!cleared.ok) return cleared;

    const removed = await this.challenges.clear();
    if (!removed.ok) return removed;

    this.events.publish('challenge/abandoned', { challengeId: context.challenge.id });
    return ok(undefined);
  }
}
