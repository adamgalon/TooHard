import { Pressable, View } from 'react-native';

import { AppText } from '@presentation/components/AppText';
import { makeStyles, useTheme } from '@presentation/theme/ThemeProvider';

export interface Choice<T extends string> {
  readonly value: T;
  readonly label: string;
}

interface Props<T extends string> {
  readonly choices: readonly Choice<T>[];
  readonly selected: T;
  readonly onSelect: (value: T) => void;
}

/** Segmented control used for theme and programme selection. */
export const ChoiceGroup = <T extends string>({ choices, selected, onSelect }: Props<T>) => {
  const styles = useStyles();
  const theme = useTheme();

  return (
    <View style={styles.group}>
      {choices.map((choice) => {
        const isSelected = choice.value === selected;
        return (
          <Pressable
            key={choice.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(choice.value)}
            style={({ pressed }) => [
              styles.option,
              isSelected && { backgroundColor: theme.colors.accent },
              pressed && styles.pressed,
            ]}
          >
            <AppText variant="label" color={isSelected ? 'onAccent' : 'secondary'}>
              {choice.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
};

const useStyles = makeStyles((theme) => ({
  group: {
    flexDirection: 'row',
    padding: theme.spacing.xs,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
  pressed: { opacity: 0.7 },
}));
