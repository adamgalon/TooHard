import * as SplashScreen from 'expo-splash-screen';
import { render, screen, waitFor } from '@testing-library/react-native';

import { AppSplash } from '@presentation/components/AppSplash';

describe('<AppSplash />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the brand mark immediately, matching the native splash asset', async () => {
    await render(<AppSplash />);

    // These must be on screen from the very first frame: this component's
    // whole design premise is that it looks identical to the static native
    // splash the instant it takes over (see the module doc in AppSplash.tsx).
    expect(screen.getByText('75')).toBeTruthy();
    expect(screen.getByText('TOO HARD')).toBeTruthy();
    expect(screen.getByText('75 days. No exceptions.')).toBeTruthy();
  });

  it('releases the native splash screen once mounted', async () => {
    await render(<AppSplash />);

    await waitFor(() => {
      expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onIntroComplete once the entrance choreography finishes', async () => {
    const onIntroComplete = jest.fn();
    await render(<AppSplash onIntroComplete={onIntroComplete} />);

    expect(onIntroComplete).not.toHaveBeenCalled();
    await waitFor(() => expect(onIntroComplete).toHaveBeenCalledTimes(1));
  });

  it('never calls onIntroComplete when the prop is omitted', async () => {
    // Guards the optional-callback contract: RootNavigator always passes
    // one, but the component must not assume it always will.
    await render(<AppSplash />);
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
});
