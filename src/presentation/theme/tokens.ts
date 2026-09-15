/**
 * Design tokens.
 *
 * Components never hard-code a colour or a pixel value; they read from a theme.
 * That is what makes the dark/light switch a one-line preference rather than a
 * refactor, and what keeps spacing consistent across screens.
 */
export interface ThemeColors {
  readonly background: string;
  readonly surface: string;
  readonly surfaceRaised: string;
  readonly border: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly accent: string;
  readonly accentMuted: string;
  readonly onAccent: string;
  readonly success: string;
  readonly warning: string;
  readonly danger: string;
  readonly track: string;
  readonly overlay: string;
}

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 44, lineHeight: 48, fontWeight: '800' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
} as const;

export type TypographyVariant = keyof typeof typography;

const dark: ThemeColors = {
  background: '#0B0B0F',
  surface: '#15161C',
  surfaceRaised: '#1E2029',
  border: '#2A2D38',
  textPrimary: '#F5F6FA',
  textSecondary: '#A9AEC0',
  textMuted: '#6C7287',
  accent: '#FF4D4D',
  accentMuted: '#3A1B20',
  onAccent: '#FFFFFF',
  success: '#3DDC97',
  warning: '#FFB703',
  danger: '#FF5A5F',
  track: '#23252F',
  overlay: 'rgba(0,0,0,0.6)',
};

const light: ThemeColors = {
  background: '#F6F6F8',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  border: '#E3E4EA',
  textPrimary: '#14151A',
  textSecondary: '#565A69',
  textMuted: '#8A8F9E',
  accent: '#E03131',
  accentMuted: '#FCE7E7',
  onAccent: '#FFFFFF',
  success: '#12A46B',
  warning: '#C77700',
  danger: '#D64045',
  track: '#E8E9EE',
  overlay: 'rgba(15,17,23,0.35)',
};

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  readonly mode: ThemeMode;
  readonly colors: ThemeColors;
  readonly spacing: typeof spacing;
  readonly radius: typeof radius;
  readonly typography: typeof typography;
}

export const buildTheme = (mode: ThemeMode, accent?: string): Theme => {
  const base = mode === 'dark' ? dark : light;
  return {
    mode,
    colors: accent ? { ...base, accent } : base,
    spacing,
    radius,
    typography,
  };
};
