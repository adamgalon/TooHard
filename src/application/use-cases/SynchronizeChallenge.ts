import type { EventBus } from '@core/events/EventBus';
import { ok, type Result } from '@core/result/Result';
import type { DomainEventMap } from '@domain/events/DomainEvents';
import { Challenges, type Challenge } from '@domain/challenge/Challenge';
import { DailyLogs, type DailyLog } from '@domain/challenge/DailyLog';
import type { Clock } from '@domain/ports/Clock';
import type { ChallengeRepository, DailyLogRepository } from '@domain/ports/Repositories';
import { CalendarDates, type CalendarDate } from '@domain/value-objects/CalendarDate';
import type { UseCase } from '@application/UseCase';
import type { ChallengeContextService } from '@application/services/ChallengeContextService';

export interface SynchronizeOutput {
  readonly challenge: Challenge | null;
  readonly restarted: boolean;
  readonly completed: boolean;
  readonly missedDates: readonly CalendarDate[];
  readonly restartReason: string | null;
}

const NOTHING: SynchronizeOutput = {
  challenge: null,
  restarted: false,
  completed: false,
  missedDates: [],
  restartReason: null,
};

/**
 * The heart of the app: reconcile stored state with the passage of time.
 *
 * Runs on launch and whenever the app returns to the foreground. It settles
 * every elapsed day as completed or missed, hands missed days to the
 * programme's failure policy, and closes the challenge once the run is over.
 */
export class SynchronizeChallengeUseCase implements UseCase<void, SynchronizeOutput> {
  constructor(
    private readonly context: ChallengeContextService,
    private readonly challenges: ChallengeRepository,
    private readonly logs: DailyLogRepository,
    private readonly clock: Clock,
    private readonly events: EventBus<DomainEventMap>,
  ) {}

  async execute(): Promise<Result<SynchronizeOutput>> {
    const loaded = await this.context.load();
    if (!loaded.ok) return loaded;
    const context = loaded.value;
    if (context === null) return ok(NOTHING);
    if (context.challenge.status !== 'active') {
      return ok({ ...NOTHING, challenge: context.challenge });
    }

    const dates = this.context.elapsedDates(context);
    if (dates.length === 0) return ok({ ...NOTHING, challenge: context.challenge });

    const stored = await this.logs.listForAttempt({
      challengeId: context.challenge.id,
      attempt: context.challenge.attempt,
    });
    if (!stored.ok) return stored;
    const byDate = new Map(stored.value.map((log) => [log.date, log] as const));

    const touched: DailyLog[] = [];
    const missedDates: CalendarDate[] = [];
    let completedDays = 0;
    let firstMiss: { date: CalendarDate; dayNumber: number } | null = null;

    for (const date of dates) {
      const existing = byDate.get(date);
      const log =
        existing ??
        DailyLogs.create({
          challengeId: context.challenge.id,
          attempt: context.challenge.attempt,
          date,
          dayNumber: Challenges.dayNumberFor(context.challenge, date),
          program: context.program,
          strategies: context.strategies,
          updatedAt: this.clock.nowIso(),
        });

      const isComplete = context.dayComplete.isSatisfiedBy(log);
      const isPast = CalendarDates.isBefore(date, context.today);
      const status = isComplete ? 'completed' : isPast ? 'missed' : 'pending';
      const settled = DailyLogs.withStatus(log, status, this.clock.nowIso());

      if (settled !== log || existing === undefined) touched.push(settled);
      if (status === 'completed') completedDays += 1;
      if (status === 'missed') {
        missedDates.push(date);
        firstMiss ??= { date, dayNumber: settled.dayNumber };
        if (existing?.status !== 'missed') {
          this.events.publish('day/missed', { date, dayNumber: settled.dayNumber });
        }
      }
    }

    if (touched.length > 0) {
      const persisted = await this.logs.saveMany(touched);
      if (!persisted.ok) return persisted;
    }

    if (firstMiss) {
      const outcome = context.policy.onDayMissed({
        program: context.program,
        missedDate: firstMiss.date,
        dayNumber: firstMiss.dayNumber,
        completedDays,
      });

      if (outcome.kind === 'restart') {
        // A fresh attempt starts today; the failed attempt keeps its logs so
        // the history screen can still show how far the user got.
        const restarted = Challenges.restart(context.challenge, {
          from: context.today,
          endedOn: firstMiss.date,
          completedDays,
        });
        const saved = await this.challenges.save(restarted);
        if (!saved.ok) return saved;

        this.events.publish('challenge/restarted', {
          challengeId: restarted.id,
          attempt: restarted.attempt,
          reason: outcome.reason,
        });
        return ok({
          challenge: restarted,
          restarted: true,
          completed: false,
          missedDates,
          restartReason: outcome.reason,
        });
      }
    }

    const lastDate = Challenges.lastDate(context.challenge, context.program.durationDays);
    const runIsOver =
      completedDays >= context.program.durationDays ||
      CalendarDates.isAfter(context.today, lastDate);

    if (runIsOver) {
      const completed = Challenges.complete(context.challenge, this.clock.nowIso());
      const saved = await this.challenges.save(completed);
      if (!saved.ok) return saved;
      this.events.publish('challenge/completed', {
        challengeId: completed.id,
        totalDays: context.program.durationDays,
      });
      return ok({
        challenge: completed,
        restarted: false,
        completed: true,
        missedDates,
        restartReason: null,
      });
    }

    return ok({
      challenge: context.challenge,
      restarted: false,
      completed: false,
      missedDates,
      restartReason: null,
    });
  }
}
