import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@presentation/theme/ThemeProvider';

interface Props {
  readonly ratio: number;
  readonly size?: number;
  readonly thickness?: number;
  readonly color?: string;
  readonly trackColor?: string;
  readonly children?: React.ReactNode;
}

/** Circular progress indicator; `ratio` is clamped to 0…1. */
export const ProgressRing = ({
  ratio,
  size = 160,
  thickness = 12,
  color,
  trackColor,
  children,
}: Props) => {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={thickness}
          stroke={trackColor ?? theme.colors.track}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={thickness}
          stroke={color ?? theme.colors.accent}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          // Start at 12 o'clock instead of 3 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
};
