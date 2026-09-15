import { CalendarDates } from '@domain/value-objects/CalendarDate';

import { CLASSIC, SOFT, completeToday, createHarness, type Harness } from '../support/harness';

const dashboardOf = async (harness: Harness) => {
  const result = await harness.container.useCases.getDashboard.execute();
  if (!result.ok) throw result.error;
  return result.value;
};

describe('starting a challenge', () => {
  it('produces a day-1 dashboard with every task unsatisfied', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });

    const dashboard = await dashboardOf(harness);
    expect(dashboard).not.toBeNull();
    expect(dashboard?.dayNumber).toBe(1);
    expect(dashboard?.attempt).toBe(1);
    expect(dashboard?.today.tasks).toHaveLength(6);
    expect(dashboard?.today.tasks.every((task) => !task.satisfied)).toBe(true);
  });

  it('returns no dashboard before a challenge exists', async () => {
    const harness = createHarness();
    expect(await dashboardOf(harness)).toBeNull();
  });
});

describe('completing a day', () => {
  it('marks the day completed and counts it towards the streak', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });
    await completeToday(harness);

    const dashboard = await dashboardOf(harness);
    expect(dashboard?.today.status).toBe('completed');
    expect(dashboard?.completedDays).toBe(1);
    expect(dashboard?.currentStreak).toBe(1);
  });

  it('publishes day/completed exactly once', async () => {
    const harness = createHarness();
    const completions: unknown[] = [];
    harness.events.subscribe('day/completed', (payload) => completions.push(payload));

    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });
    await completeToday(harness);
    // Re-applying a satisfied task must not re-announce the completion.
    await completeToday(harness);

    expect(completions).toHaveLength(1);
  });

  it('refuses edits to a day that is not today', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });
    const dashboard = await dashboardOf(harness);
    const task = dashboard?.today.tasks[0];
    if (!task) throw new Error('expected a task');

    harness.clock.advanceDays(1);
    const result = await harness.container.useCases.updateTaskProgress.execute({
      date: CalendarDates.unsafe('2026-01-01'),
      taskId: task.id,
      command: { type: 'toggle' },
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('VALIDATION_FAILED');
  });
});

describe('missing a day', () => {
  it('restarts the attempt under the strict policy', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });
    await completeToday(harness);

    // Day 2 goes by untouched.
    harness.clock.advanceDays(2);
    const synchronized = await harness.container.useCases.synchronize.execute();
    if (!synchronized.ok) throw synchronized.error;

    expect(synchronized.value.restarted).toBe(true);
    expect(synchronized.value.challenge?.attempt).toBe(2);

    const dashboard = await dashboardOf(harness);
    expect(dashboard?.dayNumber).toBe(1);
    expect(dashboard?.completedDays).toBe(0);
    // The failed attempt is remembered rather than erased.
    expect(dashboard?.bestAttemptDays).toBe(1);
  });

  it('keeps the run going under the forgiving policy', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: SOFT });
    await completeToday(harness);

    harness.clock.advanceDays(2);
    const synchronized = await harness.container.useCases.synchronize.execute();
    if (!synchronized.ok) throw synchronized.error;

    expect(synchronized.value.restarted).toBe(false);
    expect(synchronized.value.missedDates).toHaveLength(1);

    const dashboard = await dashboardOf(harness);
    expect(dashboard?.attempt).toBe(1);
    expect(dashboard?.dayNumber).toBe(3);
    expect(dashboard?.completedDays).toBe(1);
  });

  it('never marks today as missed', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });

    const synchronized = await harness.container.useCases.synchronize.execute();
    if (!synchronized.ok) throw synchronized.error;
    expect(synchronized.value.missedDates).toHaveLength(0);
    expect(synchronized.value.restarted).toBe(false);
  });
});

describe('finishing the programme', () => {
  it('completes the challenge on the final day', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: SOFT });

    for (let day = 1; day <= 75; day += 1) {
      await completeToday(harness);
      if (day < 75) {
        harness.clock.advanceDays(1);
        await harness.container.useCases.synchronize.execute();
      }
    }

    const dashboard = await dashboardOf(harness);
    expect(dashboard?.status).toBe('completed');
    expect(dashboard?.completedDays).toBe(75);
  }, 30000);
});

describe('progress photos', () => {
  it('stores the captured photo against the day', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });
    const dashboard = await dashboardOf(harness);
    if (!dashboard) throw new Error('expected a dashboard');

    const result = await harness.container.useCases.captureProgressPhoto.execute({
      date: dashboard.today.date,
      source: 'camera',
    });
    if (!result.ok) throw result.error;

    const photoTask = result.value?.today.tasks.find((task) => task.kind === 'photo');
    expect(photoTask?.satisfied).toBe(true);
  });
});
