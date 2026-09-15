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
});
