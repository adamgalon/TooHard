import { ok, type Result } from '@core/result/Result';
import { Challenges } from '@domain/challenge/Challenge';
import { DailyLogs, type DailyLog } from '@domain/challenge/DailyLog';
import type { DailyLogRepository } from '@domain/ports/Repositories';
import { CalendarDates } from '@domain/value-objects/CalendarDate';
import type { UseCase } from '@application/UseCase';
import type { CalendarCell, CalendarView } from '@application/dto/Views';
import type { ChallengeContextService } from '@application/services/ChallengeContextService';

/** Builds the 75-cell grid for the current attempt. */
export class GetCalendarUseCase implements UseCase<void, CalendarView | null> {
  constructor(
    private readonly context: ChallengeContextService,
    private readonly logs: DailyLogRepository,
  ) {}

  async execute(): Promise<Result<CalendarView | null>> {
    const loaded = await this.context.load();
    if (!loaded.ok) return loaded;
    if (loaded.value === null) return ok(null);
    const context = loaded.value;

    const stored = await this.logs.listForAttempt({
      challengeId: context.challenge.id,
      attempt: context.challenge.attempt,
    });
    if (!stored.ok) return stored;

    const byDate = new Map<string, DailyLog>(stored.value.map((log) => [log.date, log]));
    const cells: CalendarCell[] = Array.from(
      { length: context.program.durationDays },
      (_, index) => {
        const dayNumber = index + 1;
        const date = Challenges.dateForDay(context.challenge, dayNumber);
        const log = byDate.get(date);
        return {
          date,
          dayNumber,
          status: log?.status ?? 'pending',
          ratio: log
            ? DailyLogs.completionRatio(log, context.program, context.strategies)
            : 0,
          isToday: CalendarDates.isSame(date, context.today),
          isFuture: CalendarDates.isAfter(date, context.today),
        };
      },
    );

    return ok({
      attempt: context.challenge.attempt,
      totalDays: context.program.durationDays,
      cells,
    });
  }
}
