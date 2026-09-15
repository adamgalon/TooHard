import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native';

import { AppText } from '@presentation/components/AppText';
import { makeStyles, useTheme } from '@presentation/theme/ThemeProvider';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: Variant;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly icon?: string;
  readonly fullWidth?: boolean;
  readonly style?: ViewStyle;
}

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  fullWidth = true,
  style,
}: Props) => {
  const styles = useStyles();
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const textColor =
    variant === 'primary' ? 'onAccent' : variant === 'danger' ? 'danger' : 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.colors.onAccent : theme.colors.accent} />
      ) : (
        <View style={styles.content}>
          {icon ? <AppText variant="body">{icon} </AppText> : null}
          <AppText variant="label" color={textColor}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
};

const useStyles = makeStyles((theme) => ({
  base: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 1,
  },
  content: { flexDirection: 'row', alignItems: 'center' },
  fullWidth: { alignSelf: 'stretch' },
  primary: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  secondary: { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  danger: { backgroundColor: 'transparent', borderColor: theme.colors.danger },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
}));
