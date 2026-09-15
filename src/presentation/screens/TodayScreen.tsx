import { useCallback, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import type { PhotoSource } from '@domain/ports/Services';
import type { TaskId, TaskInput } from '@domain/tasks/Task';
import { CalendarDates } from '@domain/value-objects/CalendarDate';
import { AppText } from '@presentation/components/AppText';
import { Banner } from '@presentation/components/Banner';
import { Card } from '@presentation/components/Card';
import { ProgressRing } from '@presentation/components/ProgressRing';
import { ScreenContainer } from '@presentation/components/ScreenContainer';
import { StatTile } from '@presentation/components/StatTile';
import { TaskCard } from '@presentation/components/TaskCard';
import { useChallenge } from '@presentation/state/StoreProvider';
import { makeStyles, useTheme } from '@presentation/theme/ThemeProvider';

export const TodayScreen = () => {
  const styles = useStyles();
  const theme = useTheme();

  const dashboard = useChallenge((state) => state.dashboard);
  const notice = useChallenge((state) => state.notice);
  const error = useChallenge((state) => state.error);
  const phase = useChallenge((state) => state.phase);
  const sendTaskCommand = useChallenge((state) => state.sendTaskCommand);
  const capturePhoto = useChallenge((state) => state.capturePhoto);
  const saveNote = useChallenge((state) => state.saveNote);
  const dismissNotice = useChallenge((state) => state.dismissNotice);
  const clearError = useChallenge((state) => state.clearError);
  const refresh = useChallenge((state) => state.refresh);

  // Adjusting state during render (rather than in an effect) keeps the draft in
  // step with the day without clobbering what the user is typing on a refresh.
  const [note, setNote] = useState(dashboard?.today.note ?? '');
  const [noteDate, setNoteDate] = useState(dashboard?.today.date);
  if (dashboard && dashboard.today.date !== noteDate) {
    setNoteDate(dashboard.today.date);
    setNote(dashboard.today.note ?? '');
  }

  const onCommand = useCallback(
    (taskId: TaskId, command: TaskInput) => {
      void sendTaskCommand(taskId, command);
    },
    [sendTaskCommand],
  );

  const onPickPhoto = useCallback(
    (taskId: TaskId) => {
      const choose = (source: PhotoSource) => void capturePhoto(taskId, source);
      Alert.alert('Progress photo', 'Where should it come from?', [
        { text: 'Camera', onPress: () => choose('camera') },
        { text: 'Photo library', onPress: () => choose('library') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [capturePhoto],
  );

  if (!dashboard) {
    return (
      <ScreenContainer>
        <AppText variant="body" color="muted">
          {phase === 'loading' ? 'Loading your challenge…' : 'No challenge in progress.'}
        </AppText>
      </ScreenContainer>
    );
  }

  const { today } = dashboard;
  const isCompleted = dashboard.status === 'completed';
  const notStarted = dashboard.startsInDays > 0;

  return (
    <ScreenContainer refreshing={phase === 'loading'} onRefresh={() => void refresh()}>
      <View style={styles.header}>
        <View>
          <AppText variant="caption" color="muted" uppercase>
            {dashboard.programName} · attempt {dashboard.attempt}
          </AppText>
          <AppText variant="title">
            {CalendarDates.format(today.date, 'EEEE d MMMM')}
          </AppText>
        </View>
      </View>

      {error ? (
        <Banner tone="danger" title="Something went wrong" message={error.message} onDismiss={clearError} />
      ) : null}
      {notice ? (
        <Banner tone={notice.tone} title={notice.title} message={notice.message} onDismiss={dismissNotice} />
      ) : null}

      <Card style={styles.ringCard}>
        <ProgressRing ratio={today.ratio} size={172} thickness={14}>
          <View style={styles.ringCenter}>
            <AppText variant="caption" color="muted" uppercase>
              Day
            </AppText>
            <AppText variant="display">{dashboard.dayNumber}</AppText>
            <AppText variant="caption" color="muted">
              of {dashboard.totalDays}
            </AppText>
          </View>
        </ProgressRing>
        <AppText variant="body" color="secondary" align="center">
          {isCompleted
            ? 'Every day done. The challenge is complete.'
            : notStarted
              ? `Your challenge starts in ${dashboard.startsInDays} day(s).`
              : today.status === 'completed'
                ? 'Today is closed out. Nothing left to do.'
                : `${Math.round(today.ratio * 100)}% of today is done.`}
        </AppText>
      </Card>

      <View style={styles.tiles}>
        <StatTile label="Streak" value={`${dashboard.currentStreak}`} hint="days in a row" emphasis />
        <StatTile label="Completed" value={`${dashboard.completedDays}`} hint={`of ${dashboard.totalDays}`} />
        <StatTile label="Remaining" value={`${dashboard.daysRemaining}`} hint="days to go" />
        <StatTile label="Best run" value={`${dashboard.bestAttemptDays}`} hint="across all attempts" />
      </View>

      <AppText variant="heading">Today&apos;s tasks</AppText>
      {today.tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          editable={today.isEditable}
          onCommand={onCommand}
          onPickPhoto={onPickPhoto}
        />
      ))}

      <Card style={styles.noteCard}>
        <AppText variant="heading">Journal</AppText>
        <AppText variant="caption" color="muted">
          One line about how today actually went.
        </AppText>
        <TextInput
          value={note}
          onChangeText={setNote}
          onBlur={() => void saveNote(note)}
          editable={today.isEditable}
          multiline
          placeholder="Woke up at 5, outdoor run in the rain…"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.noteInput}
        />
      </Card>
    </ScreenContainer>
  );
};

const useStyles = makeStyles((theme) => ({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ringCard: { alignItems: 'center', gap: theme.spacing.lg },
  ringCenter: { alignItems: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  noteCard: { gap: theme.spacing.sm },
  noteInput: {
    minHeight: 84,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    textAlignVertical: 'top',
    ...theme.typography.body,
  },
}));
