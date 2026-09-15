import { AppErrors } from '@core/errors/AppError';
import { err, type Result } from '@core/result/Result';
import { DailyLogs } from '@domain/challenge/DailyLog';
import type { Clock } from '@domain/ports/Clock';
import type { DailyLogRepository } from '@domain/ports/Repositories';
import { CalendarDates, type CalendarDate } from '@domain/value-objects/CalendarDate';
import type { UseCase } from '@application/UseCase';
import type { DashboardView } from '@application/dto/Views';
import type { ChallengeContextService } from '@application/services/ChallengeContextService';

export interface SetDayNoteInput {
  readonly date: CalendarDate;
  readonly note: string | null;
}

export class SetDayNoteUseCase implements UseCase<SetDayNoteInput, DashboardView> {
  constructor(
    private readonly context: ChallengeContextService,
    private readonly logs: DailyLogRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: SetDayNoteInput): Promise<Result<DashboardView>> {
    const loaded = await this.context.require();
    if (!loaded.ok) return loaded;
    const context = loaded.value;

    if (!CalendarDates.isSame(input.date, context.today)) {
      return err(AppErrors.validation('Notes can only be written for today.'));
    }

    const found = await this.context.logFor(context, input.date);
    if (!found.ok) return found;

    const saved = await this.logs.save(
      DailyLogs.withNote(found.value, input.note, this.clock.nowIso()),
    );
    if (!saved.ok) return saved;

    return this.context.assembleDashboard(context);
  }
}
