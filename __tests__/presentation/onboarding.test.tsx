import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { App } from '@presentation/App';

import { createHarness } from '../support/harness';

describe('Onboarding', () => {
  it('defaults to 75 Hard and starts it on the first tap', async () => {
    const harness = createHarness();
    const user = userEvent.setup();
    await render(<App container={harness.container} />);

    await waitFor(() => expect(screen.getByText('75 days.')).toBeTruthy());
    expect(screen.getByText('Start 75 Hard')).toBeTruthy();

    await user.press(screen.getByText('Start 75 Hard'));

    await waitFor(() => expect(screen.getByText('Today')).toBeTruthy());
    expect(screen.getByText('75 Hard · attempt 1')).toBeTruthy();
    // Classic's six tasks, including the two workout variants and reading.
    expect(screen.getByText('Progress photo')).toBeTruthy();
  }, 30000);

  it('switches the selected programme and starts that one instead', async () => {
    const harness = createHarness();
    const user = userEvent.setup();
    await render(<App container={harness.container} />);

    await waitFor(() => expect(screen.getByText('75 days.')).toBeTruthy());
    await user.press(screen.getByText('75 Soft'));

    await waitFor(() => expect(screen.getByText('Start 75 Soft')).toBeTruthy());
    await user.press(screen.getByText('Start 75 Soft'));

    await waitFor(() => expect(screen.getByText('Today')).toBeTruthy());
    expect(screen.getByText('75 Soft · attempt 1')).toBeTruthy();
    // Soft has no progress-photo task.
    expect(screen.queryByText('Progress photo')).toBeNull();
  }, 30000);
});
