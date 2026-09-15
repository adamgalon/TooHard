import { ok, type Result } from '@core/result/Result';
import type { UseCase } from '@application/UseCase';
import type { DashboardView } from '@application/dto/Views';
import type { ChallengeContextService } from '@application/services/ChallengeContextService';

/** `null` means "no challenge yet" — the signal the navigator uses to onboard. */
export class GetDashboardUseCase implements UseCase<void, DashboardView | null> {
  constructor(private readonly context: ChallengeContextService) {}

  async execute(): Promise<Result<DashboardView | null>> {
    const loaded = await this.context.load();
    if (!loaded.ok) return loaded;
    if (loaded.value === null) return ok(null);
    return this.context.assembleDashboard(loaded.value);
  }
}
