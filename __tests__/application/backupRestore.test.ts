import { CLASSIC, completeToday, createHarness, SOFT } from '../support/harness';

describe('backup', () => {
  it('captures the challenge, every daily log, and settings', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });
    await completeToday(harness);

    const backed = await harness.container.useCases.backupData.execute();
    if (!backed.ok) throw backed.error;
    // The exact filename format is ExpoBackupIO's concern, not this use
    // case's — like every other Expo adapter in this codebase (PhotoStorage,
    // PhotoCapture, ReminderScheduler), it isn't unit tested directly and is
    // instead trusted via the pattern (Zod-validate, map, translate errors)
    // plus running the real app. The use case's job is just to hand the port
    // a bundle and report back whatever file info it returns.
    expect(backed.value.fileName).toBeTruthy();

    const restored = await harness.container.useCases.restoreData.execute();
    if (!restored.ok) throw restored.error;
    expect(restored.value).toEqual({ restored: true, logCount: 1 });
  });

  it('gathers logs from every attempt of a restarted challenge, not just the current one', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });
    await completeToday(harness); // day 1 of attempt 1, completed

    // Day 2 goes by untouched — the strict policy restarts the attempt.
    harness.clock.advanceDays(2);
    await harness.container.useCases.synchronize.execute();
    await completeToday(harness); // day 1 of attempt 2, completed

    await harness.container.useCases.backupData.execute();

    const restored = await harness.container.useCases.restoreData.execute();
    if (!restored.ok) throw restored.error;
    // One completed day from attempt 1, one from attempt 2, plus the missed
    // day-2 log that synchronize() persisted as `missed`.
    expect(restored.value.logCount).toBe(3);
  });
});

describe('restore', () => {
  it('round-trips a challenge and its logs exactly', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: SOFT });
    await completeToday(harness);
    await harness.container.useCases.backupData.execute();

    // Simulate data loss: wipe everything the way EndChallengeUseCase would.
    await harness.container.useCases.endChallenge.execute();
    const wiped = await harness.container.useCases.getDashboard.execute();
    expect(wiped.ok && wiped.value).toBeNull();

    const restored = await harness.container.useCases.restoreData.execute();
    if (!restored.ok) throw restored.error;
    expect(restored.value).toEqual({ restored: true, logCount: 1 });

    const dashboard = await harness.container.useCases.getDashboard.execute();
    expect(dashboard.ok && dashboard.value?.programId).toBe(SOFT);
    expect(dashboard.ok && dashboard.value?.completedDays).toBe(1);
  });

  it('reports restored:false and changes nothing when the file picker is cancelled', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });
    const before = await harness.container.useCases.getDashboard.execute();

    harness.backupIO.queueCancel();
    const restored = await harness.container.useCases.restoreData.execute();
    if (!restored.ok) throw restored.error;
    expect(restored.value).toEqual({ restored: false, logCount: 0 });

    const after = await harness.container.useCases.getDashboard.execute();
    expect(after).toEqual(before);
  });

  it('restoring an empty backup (no challenge ever started) clears the device back to onboarding', async () => {
    const harness = createHarness();
    // Never started a challenge — back it up as-is (an "empty" backup).
    await harness.container.useCases.backupData.execute();

    // Now start one, so there's something to be wiped by the restore.
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });

    const restored = await harness.container.useCases.restoreData.execute();
    if (!restored.ok) throw restored.error;
    expect(restored.value).toEqual({ restored: true, logCount: 0 });

    const dashboard = await harness.container.useCases.getDashboard.execute();
    expect(dashboard.ok && dashboard.value).toBeNull();
  });
});
