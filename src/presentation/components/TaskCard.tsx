import { Image, Pressable, View } from 'react-native';

import type { TaskInput } from '@domain/tasks/Task';
import type { TaskView } from '@application/dto/Views';
import { AppText } from '@presentation/components/AppText';
import { Card } from '@presentation/components/Card';
import { makeStyles, useTheme } from '@presentation/theme/ThemeProvider';

interface Props {
  readonly task: TaskView;
  readonly editable: boolean;
  readonly onCommand: (taskId: TaskView['id'], command: TaskInput) => void;
  readonly onPickPhoto: (taskId: TaskView['id']) => void;
}

/**
 * One card per task. The body it renders is chosen by `task.kind`, mirroring
 * the strategy that governs the same task in the domain — so a new task kind
 * means one new branch here and one new strategy there, nothing else.
 */
export const TaskCard = ({ task, editable, onCommand, onPickPhoto }: Props) => {
  const styles = useStyles();
  const theme = useTheme();

  return (
    <Card style={[styles.card, task.satisfied && { borderColor: theme.colors.success }]}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <AppText variant="title">{task.emoji}</AppText>
          <View style={styles.titleText}>
            <AppText variant="heading">{task.title}</AppText>
            <AppText variant="caption" color="muted">
              {task.subtitle}
            </AppText>
          </View>
        </View>
        <AppText variant="caption" color={task.satisfied ? 'success' : 'muted'}>
          {task.summary}
        </AppText>
      </View>

      {task.kind === 'checkbox' ? (
        <CheckboxBody task={task} editable={editable} onCommand={onCommand} />
      ) : null}
      {task.kind === 'counter' ? (
        <CounterBody task={task} editable={editable} onCommand={onCommand} />
      ) : null}
      {task.kind === 'photo' ? (
        <PhotoBody task={task} editable={editable} onPickPhoto={onPickPhoto} onCommand={onCommand} />
      ) : null}
    </Card>
  );
};

const CheckboxBody = ({ task, editable, onCommand }: Omit<Props, 'onPickPhoto'>) => {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: task.satisfied, disabled: !editable }}
      accessibilityLabel={task.title}
      disabled={!editable}
      onPress={() => onCommand(task.id, { type: 'toggle' })}
      style={({ pressed }) => [
        styles.checkRow,
        task.satisfied && { backgroundColor: theme.colors.accentMuted },
        pressed && styles.pressed,
        !editable && styles.locked,
      ]}
    >
      <View
        style={[
          styles.checkbox,
          task.satisfied && { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
        ]}
      >
        {task.satisfied ? <AppText variant="label" color="onAccent">✓</AppText> : null}
      </View>
      <AppText variant="body" color={task.satisfied ? 'primary' : 'secondary'}>
        {task.satisfied ? 'Done for today' : 'Mark as done'}
      </AppText>
    </Pressable>
  );
};

const CounterBody = ({ task, editable, onCommand }: Omit<Props, 'onPickPhoto'>) => {
  const styles = useStyles();
  const theme = useTheme();
  const target = task.target ?? 0;
  const amount = task.progress.kind === 'counter' ? task.progress.amount : 0;

  return (
    <View style={styles.counterWrapper}>
      <View style={styles.trackOuter}>
        <View
          style={[
            styles.trackInner,
            {
              width: `${Math.round(task.ratio * 100)}%`,
              backgroundColor: task.satisfied ? theme.colors.success : theme.colors.accent,
            },
          ]}
        />
      </View>
      <View style={styles.counterRow}>
        <StepperButton
          label="−"
          disabled={!editable || amount <= 0}
          onPress={() => onCommand(task.id, { type: 'decrement' })}
        />
        <View style={styles.counterValue}>
          <AppText variant="title">{amount}</AppText>
          <AppText variant="caption" color="muted">
            of {target} {task.unit}
          </AppText>
        </View>
        <StepperButton
          label="+"
          disabled={!editable}
          onPress={() => onCommand(task.id, { type: 'increment' })}
        />
      </View>
    </View>
  );
};

const StepperButton = ({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) => {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'Add' : 'Subtract'}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.stepper, pressed && styles.pressed, disabled && styles.locked]}
    >
      <AppText variant="title">{label}</AppText>
    </Pressable>
  );
};

const PhotoBody = ({
  task,
  editable,
  onPickPhoto,
  onCommand,
}: Props) => {
  const styles = useStyles();
  const uri = task.progress.kind === 'photo' ? task.progress.photoUri : null;

  return (
    <View style={styles.photoRow}>
      {uri ? (
        <Image source={{ uri }} style={styles.thumbnail} accessibilityIgnoresInvertColors />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailEmpty]}>
          <AppText variant="title" color="muted">
            📷
          </AppText>
        </View>
      )}
      <View style={styles.photoActions}>
        <Pressable
          accessibilityRole="button"
          disabled={!editable}
          onPress={() => onPickPhoto(task.id)}
          style={({ pressed }) => [styles.photoButton, pressed && styles.pressed, !editable && styles.locked]}
        >
          <AppText variant="label">{uri ? 'Retake' : 'Take photo'}</AppText>
        </Pressable>
        {uri && editable ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => onCommand(task.id, { type: 'clearPhoto' })}
            style={({ pressed }) => [styles.photoButton, pressed && styles.pressed]}
          >
            <AppText variant="label" color="danger">
              Remove
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const useStyles = makeStyles((theme) => ({
  card: { gap: theme.spacing.lg },
  header: { gap: theme.spacing.sm },
  titleGroup: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  titleText: { flex: 1, gap: 2 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterWrapper: { gap: theme.spacing.md },
  trackOuter: {
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.track,
    overflow: 'hidden',
  },
  trackInner: { height: '100%', borderRadius: theme.radius.pill },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counterValue: { alignItems: 'center' },
  stepper: {
    width: 56,
    height: 44,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg },
  thumbnail: {
    width: 72,
    height: 96,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.track,
  },
  thumbnailEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
  },
  photoActions: { flex: 1, gap: theme.spacing.sm },
  photoButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  pressed: { opacity: 0.7 },
  locked: { opacity: 0.4 },
}));
