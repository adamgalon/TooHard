import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { App } from '@presentation/App';

import { CLASSIC, SOFT, completeToday, createHarness } from '../support/harness';

describe('Wall tab', () => {
  it('shows the calendar grid and legend once a challenge is under way', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });

    const user = userEvent.setup();
    await render(<App container={harness.container} />);

    await waitFor(() => expect(screen.getByText('Today')).toBeTruthy());
    await user.press(screen.getByText('Wall'));

    await waitFor(() => expect(screen.getByText('The wall')).toBeTruthy());
    expect(screen.getByText('Attempt 1 · 75 days')).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
    expect(screen.getByText('Missed')).toBeTruthy();
  }, 30000);

  it('colors each day cell by its real status', async () => {
    const harness = createHarness();
    // Forgiving policy: a missed day stays a "missed" cell in this attempt
    // instead of triggering a restart, which is what we want to render.
    await harness.container.useCases.startChallenge.execute({ programId: SOFT });
    await completeToday(harness); // day 1: completed
    harness.clock.advanceDays(2);
    await harness.container.useCases.synchronize.execute(); // day 2: missed, now on day 3

    const user = userEvent.setup();
    await render(<App container={harness.container} />);

    await waitFor(() => expect(screen.getByText('Today')).toBeTruthy());
    await user.press(screen.getByText('Wall'));

    await waitFor(() => expect(screen.getByLabelText('Day 1, completed')).toBeTruthy());
    expect(screen.getByLabelText('Day 2, missed')).toBeTruthy();
    expect(screen.getByLabelText('Day 3, pending')).toBeTruthy();
    expect(screen.getByLabelText('Day 75, pending')).toBeTruthy();
  }, 30000);
});

describe('Progress tab', () => {
  it('reflects a completed day in the stat tiles and per-task consistency', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });
    await completeToday(harness);

    const user = userEvent.setup();
    await render(<App container={harness.container} />);

    await waitFor(() => expect(screen.getByText('Today')).toBeTruthy());
    await user.press(screen.getByText('Progress'));

    await waitFor(() => expect(screen.getByText('Consistency by task')).toBeTruthy());
    expect(screen.getByText('75 Hard · attempt 1')).toBeTruthy();
    expect(screen.getByText('🥗 Follow your diet')).toBeTruthy();
  }, 30000);
});
