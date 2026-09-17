import { ok, type Result } from '@core/result/Result';
import { DailyLogs } from '@domain/challenge/DailyLog';
import type { DailyLogRepository } from '@domain/ports/Repositories';
import type { UseCase } from '@application/UseCase';
import type { PhotoTimelineEntry, PhotoTimelineView } from '@application/dto/Views';
import type { ChallengeContextService } from '@application/services/ChallengeContextService';

/**
 * Every progress photo captured so far in the current attempt, oldest first,
 * plus a ready-made before/after pair (first photo vs. most recent) — the
 * payoff view for a 75-day challenge: watching the photos change.
 */
export class GetPhotoTimelineUseCase implements UseCase<void, PhotoTimelineView | null> {
  constructor(
    private readonly context: ChallengeContextService,
    private readonly logs: DailyLogRepository,
  ) {}

  async execute(): Promise<Result<PhotoTimelineView | null>> {
    const loaded = await this.context.load();
    if (!loaded.ok) return loaded;
    if (loaded.value === null) return ok(null);
    const context = loaded.value;

    // Not every programme has a photo task (75 Soft doesn't) — an empty
    // timeline rather than an error.
    const photoTask = context.program.tasks.find((task) => task.kind === 'photo');
    if (!photoTask) return ok({ entries: [], beforeAfter: null });

    const stored = await this.logs.listForAttempt({
      challengeId: context.challenge.id,
      attempt: context.challenge.attempt,
    });
    if (!stored.ok) return stored;

    const entries: PhotoTimelineEntry[] = [];
    for (const log of [...stored.value].sort((a, b) => a.date.localeCompare(b.date))) {
      const progress = DailyLogs.progressFor(log, photoTask, context.strategies);
      if (progress.kind === 'photo' && progress.photoUri) {
        entries.push({ date: log.date, dayNumber: log.dayNumber, photoUri: progress.photoUri });
      }
    }

    const beforeAfter =
      entries.length >= 2
        ? { before: entries[0]!, after: entries[entries.length - 1]! }
        : null;

    return ok({ entries, beforeAfter });
  }
}
