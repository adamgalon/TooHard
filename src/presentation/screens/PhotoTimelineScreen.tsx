import { Image, View } from 'react-native';

import type { PhotoTimelineEntry } from '@application/dto/Views';
import { CalendarDates } from '@domain/value-objects/CalendarDate';
import { AppText } from '@presentation/components/AppText';
import { Card } from '@presentation/components/Card';
import { ScreenContainer } from '@presentation/components/ScreenContainer';
import { useChallenge } from '@presentation/state/StoreProvider';
import { makeStyles } from '@presentation/theme/ThemeProvider';

export const PhotoTimelineScreen = () => {
  const styles = useStyles();
  const timeline = useChallenge((state) => state.photoTimeline);
  const dashboard = useChallenge((state) => state.dashboard);
  const refresh = useChallenge((state) => state.refresh);
  const phase = useChallenge((state) => state.phase);

  if (!dashboard) {
    return (
      <ScreenContainer>
        <AppText variant="title">Photos</AppText>
        <AppText variant="body" color="muted">
          Start a challenge to begin your timeline.
        </AppText>
      </ScreenContainer>
    );
  }

  const entries = timeline?.entries ?? [];
  const beforeAfter = timeline?.beforeAfter ?? null;

  return (
    <ScreenContainer refreshing={phase === 'loading'} onRefresh={() => void refresh()}>
      <AppText variant="title">Photos</AppText>
      <AppText variant="body" color="secondary">
        {entries.length > 0
          ? `${entries.length} photo${entries.length === 1 ? '' : 's'} so far this attempt.`
          : "This programme's progress photos will show up here."}
      </AppText>

      {beforeAfter ? (
        <Card style={styles.compareCard}>
          <AppText variant="heading">Before &amp; after</AppText>
          <View style={styles.compareRow}>
            <ComparisonSide label={`Day ${beforeAfter.before.dayNumber}`} entry={beforeAfter.before} />
            <View style={styles.divider} />
            <ComparisonSide label={`Day ${beforeAfter.after.dayNumber}`} entry={beforeAfter.after} />
          </View>
        </Card>
      ) : null}

      {entries.length > 0 ? (
        <Card style={styles.gridCard}>
          <AppText variant="heading">Every photo</AppText>
          <View style={styles.grid}>
            {[...entries].reverse().map((entry) => (
              <View key={entry.date} style={styles.gridItem}>
                <Image source={{ uri: entry.photoUri }} style={styles.gridThumbnail} />
                <AppText variant="caption" color="muted" align="center">
                  Day {entry.dayNumber}
                </AppText>
              </View>
            ))}
          </View>
        </Card>
      ) : null}
    </ScreenContainer>
  );
};

const ComparisonSide = ({ label, entry }: { label: string; entry: PhotoTimelineEntry }) => {
  const styles = useStyles();
  return (
    <View style={styles.compareSide}>
      <Image source={{ uri: entry.photoUri }} style={styles.compareImage} />
      <AppText variant="caption" color="muted" align="center">
        {label}
      </AppText>
      <AppText variant="caption" color="muted" align="center">
        {CalendarDates.format(entry.date, 'd MMM')}
      </AppText>
    </View>
  );
};

const useStyles = makeStyles((theme) => ({
  compareCard: { gap: theme.spacing.md },
  compareRow: { flexDirection: 'row', alignItems: 'stretch', gap: theme.spacing.sm },
  compareSide: { flex: 1, gap: theme.spacing.xs },
  compareImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.track,
  },
  divider: { width: 1, backgroundColor: theme.colors.border },
  gridCard: { gap: theme.spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  gridItem: { width: '31%', gap: theme.spacing.xxs },
  gridThumbnail: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.track,
  },
}));
