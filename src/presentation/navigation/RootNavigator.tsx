import { useEffect } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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

  if (phase === 'idle' || (phase === 'loading' && !dashboard)) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
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
