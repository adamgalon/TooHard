import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@presentation/theme/ThemeProvider';
import type { TypographyVariant } from '@presentation/theme/tokens';

type ColorKey = 'primary' | 'secondary' | 'muted' | 'accent' | 'success' | 'danger' | 'onAccent';

interface Props extends TextProps {
  readonly variant?: TypographyVariant;
  readonly color?: ColorKey;
  readonly align?: TextStyle['textAlign'];
  readonly uppercase?: boolean;
}

/** The only text primitive in the app, so every label is on the type scale. */
export const AppText = ({
  variant = 'body',
  color = 'primary',
  align,
  uppercase = false,
  style,
  ...rest
}: Props) => {
  const theme = useTheme();
  const colors: Record<ColorKey, string> = {
    primary: theme.colors.textPrimary,
    secondary: theme.colors.textSecondary,
    muted: theme.colors.textMuted,
    accent: theme.colors.accent,
    success: theme.colors.success,
    danger: theme.colors.danger,
    onAccent: theme.colors.onAccent,
  };

  return (
    <Text
      {...rest}
      style={[
        theme.typography[variant] as TextStyle,
        { color: colors[color] },
        align ? { textAlign: align } : null,
        uppercase ? { textTransform: 'uppercase', letterSpacing: 0.8 } : null,
        style,
      ]}
    />
  );
};
