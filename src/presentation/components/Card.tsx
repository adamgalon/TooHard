import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles } from '@presentation/theme/ThemeProvider';

interface Props {
  readonly children: ReactNode;
  readonly raised?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}

export const Card = ({ children, raised = false, style }: Props) => {
  const styles = useStyles();
  return <View style={[styles.card, raised && styles.raised, style]}>{children}</View>;
};

const useStyles = makeStyles((theme) => ({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
  },
  raised: {
    backgroundColor: theme.colors.surfaceRaised,
  },
}));
