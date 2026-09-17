import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { App } from '@presentation/App';

import { CLASSIC, createHarness } from '../support/harness';

describe('Settings: backup and restore', () => {
  it('shows the "Your data" section with both actions', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });

    const user = userEvent.setup();
    await render(<App container={harness.container} />);

    await waitFor(() => expect(screen.getByText('Today')).toBeTruthy());
    await user.press(screen.getByText('Settings'));

    await waitFor(() => expect(screen.getByText('Your data')).toBeTruthy());
    expect(screen.getByText('Back up now')).toBeTruthy();
    expect(screen.getByText('Restore from a backup')).toBeTruthy();
  }, 30000);

  it('backing up surfaces a confirmation notice back on the Today tab', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });

    const user = userEvent.setup();
    await render(<App container={harness.container} />);

    await waitFor(() => expect(screen.getByText('Today')).toBeTruthy());
    await user.press(screen.getByText('Settings'));
    await waitFor(() => expect(screen.getByText('Back up now')).toBeTruthy());

    await user.press(screen.getByText('Back up now'));

    await user.press(screen.getByText('Today'));
    await waitFor(() => expect(screen.getByText('Backup saved')).toBeTruthy());
  }, 30000);
});
