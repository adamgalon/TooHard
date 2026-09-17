import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { App } from '@presentation/App';

import { CLASSIC, completeToday, createHarness } from '../support/harness';

describe('Photos tab', () => {
  it('shows an empty state before any photo is captured', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });

    const user = userEvent.setup();
    await render(<App container={harness.container} />);

    await waitFor(() => expect(screen.getByText('Today')).toBeTruthy());
    await user.press(screen.getByText('Photos'));

    await waitFor(() =>
      expect(screen.getByText("This programme's progress photos will show up here.")).toBeTruthy(),
    );
  }, 30000);

  it('shows the before/after pair once two photos exist', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });
    await completeToday(harness);
    harness.clock.advanceDays(1);
    await harness.container.useCases.synchronize.execute();
    await completeToday(harness);

    const user = userEvent.setup();
    await render(<App container={harness.container} />);

    await waitFor(() => expect(screen.getByText('Today')).toBeTruthy());
    await user.press(screen.getByText('Photos'));

    await waitFor(() => expect(screen.getByText('Before & after')).toBeTruthy());
    expect(screen.getByText('2 photos so far this attempt.')).toBeTruthy();
  }, 30000);
});
