import { View } from 'react-native';

import { AppText } from '@presentation/components/AppText';
import { Card } from '@presentation/components/Card';
import { ScreenContainer } from '@presentation/components/ScreenContainer';
import { StatTile } from '@presentation/components/StatTile';
import { useChallenge } from '@presentation/state/StoreProvider';
import { makeStyles, useTheme } from '@presentation/theme/ThemeProvider';

const percent = (ratio: number): string => `${Math.round(ratio * 100)}%`;

export const StatsScreen = () => {
  const styles = useStyles();
  const theme = useTheme();
  const statistics = useChallenge((state) => state.statistics);
  const refresh = useChallenge((state) => state.refresh);
  const phase = useChallenge((state) => state.phase);

  if (!statistics) {
    return (
      <ScreenContainer>
        <AppText variant="title">Progress</AppText>
        <AppText variant="body" color="muted">
          Numbers appear once your challenge is under way.
        </AppText>
      </ScreenContainer>
    );
  }

  const { statistics: stats } = statistics;

  return (
    <ScreenContainer refreshing={phase === 'loading'} onRefresh={() => void refresh()}>
      <AppText variant="title">Progress</AppText>
      <AppText variant="body" color="secondary">
        {statistics.programName} · attempt {statistics.attempt}
      </AppText>

      <View style={styles.tiles}>
        <StatTile label="Completed" value={`${stats.completedDays}`} hint={`of ${statistics.totalDays}`} emphasis />
        <StatTile label="Missed" value={`${stats.missedDays}`} hint="days" />
        <StatTile label="Current streak" value={`${stats.currentStreak}`} hint="days" />
        <StatTile label="Longest streak" value={`${stats.longestStreak}`} hint="days" />
      </View>

      <Card style={styles.section}>
        <AppText variant="heading">Consistency by task</AppText>
        <AppText variant="caption" color="muted">
          Share of tracked days where each task was satisfied.
        </AppText>
        {stats.perTask.map((task) => (
          <View key={task.taskId} style={styles.taskRow}>
            <View style={styles.taskLabel}>
              <AppText variant="body">
                {task.emoji} {task.title}
              </AppText>
              <AppText variant="caption" color="muted">
                {task.completedDays}/{task.trackedDays} days · {percent(task.rate)}
              </AppText>
            </View>
            <View style={styles.trackOuter}>
              <View
                style={[
                  styles.trackInner,
                  {
                    width: `${Math.round(task.rate * 100)}%`,
                    backgroundColor: task.rate >= 0.9 ? theme.colors.success : theme.colors.accent,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </Card>

      {statistics.previousAttempts.length > 0 ? (
        <Card style={styles.section}>
          <AppText variant="heading">Previous attempts</AppText>
          {statistics.previousAttempts.map((attempt) => (
            <View key={`${attempt.attempt}-${attempt.startDate}`} style={styles.attemptRow}>
              <AppText variant="body">Attempt {attempt.attempt}</AppText>
              <AppText variant="caption" color="muted">
                {attempt.completedDays} day(s) · {attempt.reason === 'failed' ? 'reset' : 'ended'} on{' '}
                {attempt.endedOn}
              </AppText>
            </View>
          ))}
        </Card>
      ) : null}
    </ScreenContainer>
  );
};

const useStyles = makeStyles((theme) => ({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  section: { gap: theme.spacing.md },
  taskRow: { gap: theme.spacing.sm },
  taskLabel: { gap: 2 },
  trackOuter: {
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.track,
    overflow: 'hidden',
  },
  trackInner: { height: '100%', borderRadius: theme.radius.pill },
  attemptRow: {
    gap: 2,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
}));
