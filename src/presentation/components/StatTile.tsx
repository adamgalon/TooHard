import { View } from 'react-native';

import { AppText } from '@presentation/components/AppText';
import { makeStyles } from '@presentation/theme/ThemeProvider';

interface Props {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly emphasis?: boolean;
}

export const StatTile = ({ label, value, hint, emphasis = false }: Props) => {
  const styles = useStyles();
  return (
    <View style={[styles.tile, emphasis && styles.emphasis]}>
      <AppText variant="caption" color="muted" uppercase>
        {label}
      </AppText>
      <AppText variant="title" color={emphasis ? 'accent' : 'primary'}>
        {value}
      </AppText>
      {hint ? (
        <AppText variant="caption" color="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
};

const useStyles = makeStyles((theme) => ({
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emphasis: { borderColor: theme.colors.accent },
}));
