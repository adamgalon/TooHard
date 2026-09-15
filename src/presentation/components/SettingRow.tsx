import { Pressable, Switch, View } from 'react-native';

import { AppText } from '@presentation/components/AppText';
import { makeStyles, useTheme } from '@presentation/theme/ThemeProvider';

interface BaseProps {
  readonly title: string;
  readonly description?: string;
}

interface SwitchProps extends BaseProps {
  readonly kind: 'switch';
  readonly value: boolean;
  readonly onValueChange: (value: boolean) => void;
}

interface ActionProps extends BaseProps {
  readonly kind: 'action';
  readonly value?: string;
  readonly onPress: () => void;
  readonly destructive?: boolean;
}

type Props = SwitchProps | ActionProps;

export const SettingRow = (props: Props) => {
  const styles = useStyles();
  const theme = useTheme();

  const body = (
    <View style={styles.row}>
      <View style={styles.text}>
        <AppText variant="body" color={props.kind === 'action' && props.destructive ? 'danger' : 'primary'}>
          {props.title}
        </AppText>
        {props.description ? (
          <AppText variant="caption" color="muted">
            {props.description}
          </AppText>
        ) : null}
      </View>
      {props.kind === 'switch' ? (
        <Switch
          value={props.value}
          onValueChange={props.onValueChange}
          trackColor={{ true: theme.colors.accent, false: theme.colors.track }}
          thumbColor={theme.colors.surface}
        />
      ) : (
        <AppText variant="label" color="muted">
          {props.value ?? '›'}
        </AppText>
      )}
    </View>
  );

  if (props.kind === 'action') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={props.title}
        onPress={props.onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {body}
      </Pressable>
    );
  }
  return body;
};

const useStyles = makeStyles((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  text: { flex: 1, gap: 2 },
  pressed: { opacity: 0.6 },
}));
