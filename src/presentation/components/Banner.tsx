import { Pressable, View } from 'react-native';

import { AppText } from '@presentation/components/AppText';
import { makeStyles, useTheme } from '@presentation/theme/ThemeProvider';

type Tone = 'info' | 'success' | 'warning' | 'danger';

interface Props {
  readonly tone?: Tone;
  readonly title: string;
  readonly message?: string;
  readonly onDismiss?: () => void;
}

export const Banner = ({ tone = 'info', title, message, onDismiss }: Props) => {
  const styles = useStyles();
  const theme = useTheme();
  const toneColor: Record<Tone, string> = {
    info: theme.colors.accent,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
  };

  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { borderLeftColor: toneColor[tone] }]}
    >
      <View style={styles.content}>
        <AppText variant="label">{title}</AppText>
        {message ? (
          <AppText variant="caption" color="secondary">
            {message}
          </AppText>
        ) : null}
      </View>
      {onDismiss ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onDismiss} hitSlop={12}>
          <AppText variant="label" color="muted">
            ✕
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
};

const useStyles = makeStyles((theme) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
  },
  content: { flex: 1, gap: 2 },
}));
