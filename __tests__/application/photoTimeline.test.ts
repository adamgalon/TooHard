import { CLASSIC, SOFT, completeToday, createHarness } from '../support/harness';

describe('GetPhotoTimelineUseCase', () => {
  it('is empty before any photo is captured', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });

    const timeline = await harness.container.useCases.getPhotoTimeline.execute();
    if (!timeline.ok) throw timeline.error;
    expect(timeline.value).toEqual({ entries: [], beforeAfter: null });
  });

  it('has no before/after pair with only one photo', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });
    await completeToday(harness); // captures day 1's progress photo among other tasks

    const timeline = await harness.container.useCases.getPhotoTimeline.execute();
    if (!timeline.ok) throw timeline.error;
    expect(timeline.value?.entries).toHaveLength(1);
    expect(timeline.value?.beforeAfter).toBeNull();
  });

  it('pairs the first and most recent photo once there are at least two', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });
    await completeToday(harness); // day 1

    harness.clock.advanceDays(1);
    await harness.container.useCases.synchronize.execute();
    await completeToday(harness); // day 2

    harness.clock.advanceDays(1);
    await harness.container.useCases.synchronize.execute();
    await completeToday(harness); // day 3

    const timeline = await harness.container.useCases.getPhotoTimeline.execute();
    if (!timeline.ok) throw timeline.error;
    expect(timeline.value?.entries.map((e) => e.dayNumber)).toEqual([1, 2, 3]);
    expect(timeline.value?.beforeAfter).toEqual({
      before: expect.objectContaining({ dayNumber: 1 }),
      after: expect.objectContaining({ dayNumber: 3 }),
    });
  });

  it('is empty for a programme with no photo task', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: SOFT });
    await completeToday(harness);

    const timeline = await harness.container.useCases.getPhotoTimeline.execute();
    if (!timeline.ok) throw timeline.error;
    expect(timeline.value).toEqual({ entries: [], beforeAfter: null });
  });

  it('returns null before a challenge exists', async () => {
    const harness = createHarness();
    const timeline = await harness.container.useCases.getPhotoTimeline.execute();
    expect(timeline.ok && timeline.value).toBeNull();
  });
});
