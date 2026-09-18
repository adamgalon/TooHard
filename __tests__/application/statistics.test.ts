import { CLASSIC, SOFT, completeToday, createHarness } from '../support/harness';

describe('GetStatisticsUseCase', () => {
  it('returns null before a challenge exists', async () => {
    const harness = createHarness();
    const statistics = await harness.container.useCases.getStatistics.execute();
    expect(statistics.ok && statistics.value).toBeNull();
  });

  it('computes streaks, completion rate, and per-task consistency across completed and missed days', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: SOFT });

    await completeToday(harness); // day 1: completed
    harness.clock.advanceDays(2);
    await harness.container.useCases.synchronize.execute(); // day 2: missed, now on day 3
    await completeToday(harness); // day 3: completed
    harness.clock.advanceDays(1);
    await harness.container.useCases.synchronize.execute(); // now on day 4, nothing missed
    await completeToday(harness); // day 4: completed
    harness.clock.advanceDays(2);
    await harness.container.useCases.synchronize.execute(); // day 5: missed, now on day 6
    await completeToday(harness); // day 6: completed

    const result = await harness.container.useCases.getStatistics.execute();
    if (!result.ok) throw result.error;
    const stats = result.value?.statistics;
    expect(stats).toBeDefined();

    expect(stats?.completedDays).toBe(4);
    expect(stats?.missedDays).toBe(2);
    expect(stats?.trackedDays).toBe(6);
    expect(stats?.completionRate).toBeCloseTo(4 / 6);
    // Streak resets on every missed day; the trailing run is a single day.
    expect(stats?.currentStreak).toBe(1);
    expect(stats?.longestStreak).toBe(2);

    const diet = stats?.perTask.find((task) => task.taskId === 'diet');
    expect(diet).toEqual({
      taskId: 'diet',
      title: 'Follow your diet',
      emoji: '🥗',
      completedDays: 4,
      trackedDays: 6,
      rate: 4 / 6,
    });
  });

  it('scopes statistics to the current attempt, leaving history in previousAttempts', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });
    await completeToday(harness); // attempt 1, day 1: completed

    // Day 2 goes by untouched — the strict policy restarts the attempt.
    harness.clock.advanceDays(2);
    await harness.container.useCases.synchronize.execute();

    const result = await harness.container.useCases.getStatistics.execute();
    if (!result.ok) throw result.error;

    expect(result.value?.attempt).toBe(2);
    // The fresh attempt has no logs of its own yet.
    expect(result.value?.statistics.trackedDays).toBe(0);
    expect(result.value?.previousAttempts).toHaveLength(1);
    expect(result.value?.previousAttempts[0]?.completedDays).toBe(1);
  });
});
