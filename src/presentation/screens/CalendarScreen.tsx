import { View } from 'react-native';

import { AppText } from '@presentation/components/AppText';
import { CalendarGrid } from '@presentation/components/CalendarGrid';
import { Card } from '@presentation/components/Card';
import { ScreenContainer } from '@presentation/components/ScreenContainer';
import { useChallenge } from '@presentation/state/StoreProvider';
import { makeStyles, useTheme } from '@presentation/theme/ThemeProvider';

export const CalendarScreen = () => {
  const styles = useStyles();
  const theme = useTheme();
  const calendar = useChallenge((state) => state.calendar);
  const dashboard = useChallenge((state) => state.dashboard);
  const refresh = useChallenge((state) => state.refresh);
  const phase = useChallenge((state) => state.phase);

  const legend = [
    { color: theme.colors.success, label: 'Completed' },
    { color: theme.colors.danger, label: 'Missed' },
    { color: theme.colors.surfaceRaised, label: 'Today / pending' },
    { color: theme.colors.surface, label: 'Ahead of you' },
  ];

  return (
    <ScreenContainer refreshing={phase === 'loading'} onRefresh={() => void refresh()}>
      <AppText variant="title">The wall</AppText>
      <AppText variant="body" color="secondary">
        {calendar
          ? `Attempt ${calendar.attempt} · ${calendar.totalDays} days`
          : 'Start a challenge to fill this in.'}
      </AppText>

      {calendar ? (
        <>
          <Card>
            <CalendarGrid cells={calendar.cells} />
          </Card>

          <Card style={styles.legendCard}>
            {legend.map((item) => (
              <View key={item.label} style={styles.legendRow}>
                <View style={[styles.swatch, { backgroundColor: item.color }]} />
                <AppText variant="caption" color="secondary">
                  {item.label}
                </AppText>
              </View>
            ))}
          </Card>

          {dashboard && dashboard.attempt > 1 ? (
            <AppText variant="caption" color="muted">
              You have restarted {dashboard.attempt - 1} time(s). The wall only shows the current attempt.
            </AppText>
          ) : null}
        </>
      ) : null}
    </ScreenContainer>
  );
};

const useStyles = makeStyles((theme) => ({
  legendCard: { gap: theme.spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
}));
