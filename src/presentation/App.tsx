import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DependencyProvider } from '@di/DependencyProvider';
import type { AppContainer } from '@di/types';
import { RootNavigator } from '@presentation/navigation/RootNavigator';
import { StoreProvider, useChallenge, useSettings } from '@presentation/state/StoreProvider';
import { ThemeProvider, useTheme } from '@presentation/theme/ThemeProvider';

/**
 * The theme depends on state (the user's preference and the active programme's
 * accent), so it sits inside the store provider rather than above it.
 */
const ThemedApp = () => {
  const preference = useSettings((state) => state.settings.themePreference);
  const accent = useChallenge((state) => state.dashboard?.accent);

  return (
    <ThemeProvider preference={preference} accent={accent}>
      <StatusBarForTheme />
      <RootNavigator />
    </ThemeProvider>
  );
};

const StatusBarForTheme = () => {
  const theme = useTheme();
  return <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />;
};

interface Props {
  /** Tests inject a container built from in-memory adapters. */
  readonly container?: AppContainer;
}

export const App = ({ container }: Props) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    {/* Seeding the metrics avoids a one-frame inset jump on cold start. */}
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <DependencyProvider container={container}>
        <StoreProvider>
          <ThemedApp />
        </StoreProvider>
      </DependencyProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);

export default App;
