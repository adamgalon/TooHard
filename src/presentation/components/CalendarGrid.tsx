import { useState } from 'react';
import { useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';

import type { CalendarCell } from '@application/dto/Views';
import { AppText } from '@presentation/components/AppText';
import { makeStyles, useTheme } from '@presentation/theme/ThemeProvider';

interface Props {
  readonly cells: readonly CalendarCell[];
}

const DAYS_PER_WEEK = 7;

const chunkIntoWeeks = (cells: readonly CalendarCell[]): (readonly CalendarCell[])[] => {
  const weeks: CalendarCell[][] = [];
  for (let index = 0; index < cells.length; index += DAYS_PER_WEEK) {
    weeks.push(cells.slice(index, index + DAYS_PER_WEEK));
  }
  return weeks;
};

/**
 * The wall-chart: one row per calendar week, seven days across, sized to fill
 * whatever width the screen gives it rather than a fixed pixel grid that
 * wraps arbitrarily and leaves the row uneven.
 */
export const CalendarGrid = ({ cells }: Props) => {
  const styles = useStyles();
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  // Real layout (onLayout) accounts for the card's own padding and is what
  // ends up on screen; the window width is only a same-frame estimate so the
  // grid never renders zero-size cells while waiting for that first measurement.
  const [width, setWidth] = useState(windowWidth);

  const onLayout = (event: LayoutChangeEvent): void => {
    setWidth(event.nativeEvent.layout.width);
  };

  const gap = theme.spacing.sm;
  const cellSize = (width - gap * (DAYS_PER_WEEK - 1)) / DAYS_PER_WEEK;

  const background = (cell: CalendarCell): string => {
    if (cell.status === 'completed') return theme.colors.success;
    if (cell.status === 'missed') return theme.colors.danger;
    if (cell.isFuture) return theme.colors.surface;
    return theme.colors.surfaceRaised;
  };

  return (
    <View onLayout={onLayout} style={{ gap }}>
      {chunkIntoWeeks(cells).map((week, weekIndex) => (
        <View key={`week-${weekIndex}`} style={[styles.row, { gap }]}>
          {week.map((cell) => (
            <View
              key={cell.date}
              accessibilityRole="text"
              accessibilityLabel={`Day ${cell.dayNumber}, ${cell.status}`}
              style={[
                styles.cell,
                { width: cellSize, height: cellSize, backgroundColor: background(cell) },
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
      ))}
    </View>
  );
};

const useStyles = makeStyles((theme) => ({
  row: { flexDirection: 'row' },
  cell: {
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
}));
