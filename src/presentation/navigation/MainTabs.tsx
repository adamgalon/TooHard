import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { AppText } from '@presentation/components/AppText';
import { CalendarScreen } from '@presentation/screens/CalendarScreen';
import { SettingsScreen } from '@presentation/screens/SettingsScreen';
import { StatsScreen } from '@presentation/screens/StatsScreen';
import { TodayScreen } from '@presentation/screens/TodayScreen';
import type { MainTabParamList } from '@presentation/navigation/types';
import { useTheme } from '@presentation/theme/ThemeProvider';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TabIcon = ({ glyph, focused }: { glyph: string; focused: boolean }) => (
  <AppText variant="body" style={{ opacity: focused ? 1 : 0.45 }}>
    {glyph}
  </AppText>
);

export const MainTabs = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: theme.typography.caption,
      }}
    >
      <Tab.Screen name="Today" component={TodayScreen} options={{
          tabBarIcon: ({ focused }) => <TabIcon glyph="🔥" focused={focused} />,
        }} />
      <Tab.Screen name="Wall" component={CalendarScreen} options={{
          tabBarIcon: ({ focused }) => <TabIcon glyph="🧱" focused={focused} />,
        }} />
      <Tab.Screen name="Progress" component={StatsScreen} options={{
          tabBarIcon: ({ focused }) => <TabIcon glyph="📈" focused={focused} />,
        }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{
          tabBarIcon: ({ focused }) => <TabIcon glyph="⚙️" focused={focused} />,
        }} />
    </Tab.Navigator>
  );
};
