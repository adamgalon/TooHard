import type { Result } from '@core/result/Result';
import type { DailyLog } from '@domain/challenge/DailyLog';
import type { ChallengeRepository, DailyLogRepository, SettingsRepository } from '@domain/ports/Repositories';
import type { BackupFileInfo, BackupIO } from '@domain/ports/Services';
import type { Clock } from '@domain/ports/Clock';
import type { UseCase } from '@application/UseCase';

/**
 * Exports everything the app knows about you to a file you control —
 * iCloud Drive, Google Drive, AirDrop, wherever the share sheet sends it.
 *
 * This is the "don't lose my streak" feature that doesn't require a backend,
 * an account, or trusting a server with your data: it's the exact same
 * information `RestoreDataUseCase` reads back in, moved through a file
 * instead of a network request.
 */
export class BackupDataUseCase implements UseCase<void, BackupFileInfo> {
  constructor(
    private readonly challenges: ChallengeRepository,
    private readonly logs: DailyLogRepository,
    private readonly settings: SettingsRepository,
    private readonly backupIO: BackupIO,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<Result<BackupFileInfo>> {
    const challengeResult = await this.challenges.find();
    if (!challengeResult.ok) return challengeResult;
    const challenge = challengeResult.value;

    const settingsResult = await this.settings.load();
    if (!settingsResult.ok) return settingsResult;

    // A restart keeps the same challenge id and just increments `attempt`
    // (see Challenges.restart) — only a fresh Start/End clears logs
    // entirely — so every attempt from 1 up to the current one is exactly
    // the full history of this challenge. No new repository method needed.
    const dailyLogs: DailyLog[] = [];
    if (challenge) {
      for (let attempt = 1; attempt <= challenge.attempt; attempt += 1) {
        const attemptLogs = await this.logs.listForAttempt({ challengeId: challenge.id, attempt });
        if (!attemptLogs.ok) return attemptLogs;
        dailyLogs.push(...attemptLogs.value);
      }
    }

    return this.backupIO.writeAndShare({
      challenge,
      dailyLogs,
      settings: settingsResult.value,
      exportedAt: this.clock.nowIso(),
    });
  }
}
