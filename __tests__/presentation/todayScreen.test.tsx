import { Alert } from 'react-native';
import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { App } from '@presentation/App';

import { CLASSIC, createHarness } from '../support/harness';

describe('TodayScreen: checkbox task', () => {
  it('toggles a checkbox task on tap', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });

    const user = userEvent.setup();
    await render(<App container={harness.container} />);
    await waitFor(() => expect(screen.getByText('Follow your diet')).toBeTruthy());

    const diet = screen.getByLabelText('Follow your diet');
    expect(diet.props.accessibilityState.checked).toBe(false);

    await user.press(diet);

    await waitFor(() => expect(diet.props.accessibilityState.checked).toBe(true));
  }, 30000);
});

describe('TodayScreen: counter task', () => {
  it('increments and decrements, and is satisfied once the target is reached', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });

    const user = userEvent.setup();
    await render(<App container={harness.container} />);
    // Water (3.8L, step 0.25) is the first counter task in the classic task list.
    await waitFor(() => expect(screen.getByText('Drink water')).toBeTruthy());

    // Water is the first counter task in the classic task list; its summary
    // ("<amount> / 3.8 L") is unique on screen, unlike the raw number alone.
    const add = screen.getAllByLabelText('Add')[0];
    const subtract = screen.getAllByLabelText('Subtract')[0];

    await user.press(add);
    await waitFor(() => expect(screen.getByText('0.25 / 3.8 L')).toBeTruthy());

    await user.press(subtract);
    await waitFor(() => expect(screen.getByText('0 / 3.8 L')).toBeTruthy());

    for (let i = 0; i < 16; i += 1) {
      await user.press(add);
    }
    await waitFor(() => expect(screen.getByText('4 / 3.8 L')).toBeTruthy());
  }, 30000);
});

describe('TodayScreen: journal note', () => {
  it('saves the note when the field loses focus', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });
    await render(<App container={harness.container} />);
    await waitFor(() => expect(screen.getByText('Journal')).toBeTruthy());

    const input = screen.getByPlaceholderText('Woke up at 5, outdoor run in the rain…');
    await fireEvent.changeText(input, 'Felt strong today.');
    await fireEvent(input, 'blur');

    await waitFor(async () => {
      const dashboard = await harness.container.useCases.getDashboard.execute();
      expect(dashboard.ok && dashboard.value?.today.note).toBe('Felt strong today.');
    });
  }, 30000);
});

describe('TodayScreen: progress photo', () => {
  it('attaches a photo once a source is chosen from the picker', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.text === 'Camera')?.onPress?.();
    });

    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });

    const user = userEvent.setup();
    await render(<App container={harness.container} />);
    await waitFor(() => expect(screen.getByText('Take photo')).toBeTruthy());

    await user.press(screen.getByText('Take photo'));

    await waitFor(() => expect(screen.getByText('Retake')).toBeTruthy());
    alertSpy.mockRestore();
  }, 30000);
});
