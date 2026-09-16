import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AppSplash } from '@presentation/components/AppSplash';
import { OnboardingScreen } from '@presentation/screens/OnboardingScreen';
import { MainTabs } from '@presentation/navigation/MainTabs';
import type { RootStackParamList } from '@presentation/navigation/types';
import { useChallenge, useSettings } from '@presentation/state/StoreProvider';
import { useTheme } from '@presentation/theme/ThemeProvider';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const theme = useTheme();
  const phase = useChallenge((state) => state.phase);
  const dashboard = useChallenge((state) => state.dashboard);
  const bootstrap = useChallenge((state) => state.bootstrap);
  const loadSettings = useSettings((state) => state.load);

  // Two independent conditions gate the splash, and both must clear before
  // the app appears: the first sync/settings round trip has to resolve, and
  // — regardless of how fast that is — AppSplash's entrance choreography has
  // to finish playing. A device with warm storage should still see the full,
  // deliberate reveal rather than a one-frame flash of it; a device with a
  // slow cold read is kept company by AppSplash's breathing loop instead of
  // a bare spinner.
  const [introComplete, setIntroComplete] = useState(false);
  const dataReady = !(phase === 'idle' || (phase === 'loading' && !dashboard));

  useEffect(() => {
    void loadSettings();
    void bootstrap();
  }, [bootstrap, loadSettings]);

  useEffect(() => {
    // Midnight can pass while the app sits in the background; re-synchronise on
    // the way back in so a missed day is never rendered as still-pending.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void bootstrap();
    });
    return () => subscription.remove();
  }, [bootstrap]);

  const navigationTheme: NavTheme = {
    ...(theme.mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.mode === 'dark' ? DarkTheme : DefaultTheme).colors,
      primary: theme.colors.accent,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
    },
  };

  if (!dataReady || !introComplete) {
    return <AppSplash onIntroComplete={() => setIntroComplete(true)} />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {dashboard ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
