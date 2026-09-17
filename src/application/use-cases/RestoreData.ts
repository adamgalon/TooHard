import { ok, type Result } from '@core/result/Result';
import type { ChallengeRepository, DailyLogRepository, SettingsRepository } from '@domain/ports/Repositories';
import type { BackupIO } from '@domain/ports/Services';
import type { UseCase } from '@application/UseCase';

export interface RestoreOutcome {
  /** `false` means the user backed out of the file picker — not an error. */
  readonly restored: boolean;
  readonly logCount: number;
}

const NOT_RESTORED: RestoreOutcome = { restored: false, logCount: 0 };

/**
 * Reads a file written by `BackupDataUseCase` back in, replacing whatever is
 * currently stored. This is a full replace, not a merge — the same "clean
 * slate" semantics `StartChallengeUseCase` already uses, applied to
 * restoring instead of starting fresh.
 */
export class RestoreDataUseCase implements UseCase<void, RestoreOutcome> {
  constructor(
    private readonly challenges: ChallengeRepository,
    private readonly logs: DailyLogRepository,
    private readonly settings: SettingsRepository,
    private readonly backupIO: BackupIO,
  ) {}

  async execute(): Promise<Result<RestoreOutcome>> {
    const picked = await this.backupIO.pickAndRead();
    if (!picked.ok) return picked;
    if (picked.value === null) return ok(NOT_RESTORED);
    const bundle = picked.value;

    const clearedLogs = await this.logs.clear();
    if (!clearedLogs.ok) return clearedLogs;

    if (bundle.challenge) {
      const savedChallenge = await this.challenges.save(bundle.challenge);
      if (!savedChallenge.ok) return savedChallenge;
    } else {
      const clearedChallenge = await this.challenges.clear();
      if (!clearedChallenge.ok) return clearedChallenge;
    }

    if (bundle.dailyLogs.length > 0) {
      const savedLogs = await this.logs.saveMany(bundle.dailyLogs);
      if (!savedLogs.ok) return savedLogs;
    }

    const savedSettings = await this.settings.save(bundle.settings);
    if (!savedSettings.ok) return savedSettings;

    return ok({ restored: true, logCount: bundle.dailyLogs.length });
  }
}
