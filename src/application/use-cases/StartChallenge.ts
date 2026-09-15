import { ok, type Result } from '@core/result/Result';
import type { EventBus } from '@core/events/EventBus';
import type { DomainEventMap } from '@domain/events/DomainEvents';
import { Challenges, type Challenge } from '@domain/challenge/Challenge';
import type { ProgramId } from '@domain/challenge/ChallengeProgram';
import { ChallengeIds, type IdGenerator } from '@domain/shared/Identifier';
import type { Clock } from '@domain/ports/Clock';
import type { ChallengeRepository, DailyLogRepository } from '@domain/ports/Repositories';
import type { CalendarDate } from '@domain/value-objects/CalendarDate';
import type { UseCase } from '@application/UseCase';

export interface StartChallengeInput {
  readonly programId: ProgramId;
  /** Defaults to today. */
  readonly startDate?: CalendarDate;
}

/** Begins a run, discarding any logs left over from a previous challenge. */
export class StartChallengeUseCase implements UseCase<StartChallengeInput, Challenge> {
  constructor(
    private readonly challenges: ChallengeRepository,
    private readonly logs: DailyLogRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly events: EventBus<DomainEventMap>,
  ) {}

  async execute(input: StartChallengeInput): Promise<Result<Challenge>> {
    const cleared = await this.logs.clear();
    if (!cleared.ok) return cleared;

    const challenge = Challenges.start({
      id: ChallengeIds.create(this.ids),
      programId: input.programId,
      startDate: input.startDate ?? this.clock.today(),
      createdAt: this.clock.nowIso(),
    });

    const saved = await this.challenges.save(challenge);
    if (!saved.ok) return saved;

    this.events.publish('challenge/started', {
      challengeId: challenge.id,
      startDate: challenge.startDate,
    });
    return ok(challenge);
  }
}
