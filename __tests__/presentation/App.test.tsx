import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { App } from '@presentation/App';

import { createHarness } from '../support/harness';

describe('<App />', () => {
  it('onboards when no challenge exists, then shows day 1', async () => {
    const harness = createHarness();
    const user = userEvent.setup();

    // RNTL v14 renders asynchronously.
    await render(<App container={harness.container} />);

    // Onboarding is the entry point until a challenge is stored.
    expect(await screen.findByText('75 days.')).toBeTruthy();

    await user.press(screen.getByText('Start 75 Hard'));

    await waitFor(() => expect(screen.getByText('Today')).toBeTruthy());
    expect(screen.getByText('Follow your diet')).toBeTruthy();
    expect(screen.getByText('75 Hard · attempt 1')).toBeTruthy();
    // The water target renders through the counter strategy's summary.
    expect(screen.getByText('0 / 3.8 L')).toBeTruthy();
  }, 30000);
});
