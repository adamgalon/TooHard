import { View } from 'react-native';

import type { CalendarCell } from '@application/dto/Views';
import { AppText } from '@presentation/components/AppText';
import { makeStyles, useTheme } from '@presentation/theme/ThemeProvider';

interface Props {
  readonly cells: readonly CalendarCell[];
}

/** The wall-chart: one square per day of the attempt. */
export const CalendarGrid = ({ cells }: Props) => {
  const styles = useStyles();
  const theme = useTheme();

  const background = (cell: CalendarCell): string => {
    if (cell.status === 'completed') return theme.colors.success;
    if (cell.status === 'missed') return theme.colors.danger;
    if (cell.isFuture) return theme.colors.surface;
    return theme.colors.surfaceRaised;
  };

  return (
    <View style={styles.grid}>
      {cells.map((cell) => (
        <View
          key={cell.date}
          accessibilityRole="text"
          accessibilityLabel={`Day ${cell.dayNumber}, ${cell.status}`}
          style={[
            styles.cell,
            { backgroundColor: background(cell) },
            cell.isToday && { borderColor: theme.colors.accent, borderWidth: 2 },
          ]}
        >
          <AppText
            variant="caption"
            color={cell.status === 'pending' ? (cell.isFuture ? 'muted' : 'secondary') : 'onAccent'}
          >
            {cell.dayNumber}
          </AppText>
        </View>
      ))}
    </View>
  );
};

const useStyles = makeStyles((theme) => ({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    justifyContent: 'flex-start',
  },
  cell: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
}));
