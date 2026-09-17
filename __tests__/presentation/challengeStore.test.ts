import { createChallengeStore } from '@presentation/state/challengeStore';

import { CLASSIC, completeToday, createHarness } from '../support/harness';

describe('challengeStore', () => {
  it('works when actions are detached from the store object', async () => {
    // Screens select actions (`useChallenge(s => s.refresh)`), so every action
    // must stand on its own rather than relying on `this`.
    const harness = createHarness();
    const store = createChallengeStore(harness.container);

    const { bootstrap, refresh, startChallenge } = store.getState();
    await bootstrap();
    await startChallenge(CLASSIC);
    await refresh();

    expect(store.getState().phase).toBe('ready');
    expect(store.getState().dashboard?.dayNumber).toBe(1);
  });

  it('surfaces a notice and resets to day 1 when a strict attempt is lost', async () => {
    const harness = createHarness();
    const store = createChallengeStore(harness.container);

    await store.getState().startChallenge(CLASSIC);
    await completeToday(harness);
    harness.clock.advanceDays(2);
    await store.getState().refresh();

    expect(store.getState().notice?.title).toBe('Back to day 1');
    expect(store.getState().dashboard?.attempt).toBe(2);
  });

  it('clears everything when the challenge is ended', async () => {
    const harness = createHarness();
    const store = createChallengeStore(harness.container);

    await store.getState().startChallenge(CLASSIC);
    await store.getState().endChallenge();

    expect(store.getState().dashboard).toBeNull();
    const dashboard = await harness.container.useCases.getDashboard.execute();
    expect(dashboard.ok && dashboard.value).toBeNull();
  });

  it('backs up without disturbing the current dashboard', async () => {
    const harness = createHarness();
    const store = createChallengeStore(harness.container);

    await store.getState().startChallenge(CLASSIC);
    const before = store.getState().dashboard;

    await store.getState().backupData();

    expect(store.getState().backupInFlight).toBe(false);
    expect(store.getState().notice?.title).toBe('Backup saved');
    expect(store.getState().dashboard).toEqual(before);
  });

  it('restoring reloads the dashboard from what was restored', async () => {
    const harness = createHarness();
    const store = createChallengeStore(harness.container);

    await store.getState().startChallenge(CLASSIC);
    await completeToday(harness);
    await store.getState().backupData();
    await store.getState().endChallenge();
    expect(store.getState().dashboard).toBeNull();

    await store.getState().restoreData();

    expect(store.getState().backupInFlight).toBe(false);
    expect(store.getState().notice?.title).toBe('Restored');
    expect(store.getState().dashboard?.programId).toBe(CLASSIC);
    expect(store.getState().dashboard?.completedDays).toBe(1);
  });

  it('restoring after the picker is cancelled leaves state untouched and silent', async () => {
    const harness = createHarness();
    const store = createChallengeStore(harness.container);

    await store.getState().startChallenge(CLASSIC);
    const before = store.getState().dashboard;
    const noticeBefore = store.getState().notice;

    harness.backupIO.queueCancel();
    await store.getState().restoreData();

    // No "Restored" notice replaces whatever was there before — a cancelled
    // picker is silent, not an event worth announcing.
    expect(store.getState().notice).toEqual(noticeBefore);
    expect(store.getState().dashboard).toEqual(before);
  });
});
