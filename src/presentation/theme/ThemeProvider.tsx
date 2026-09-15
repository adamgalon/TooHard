import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { StyleSheet, useColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import type { ThemePreference } from '@domain/settings/AppSettings';
import { buildTheme, type Theme } from '@presentation/theme/tokens';

const ThemeContext = createContext<Theme | null>(null);

interface Props {
  readonly children: ReactNode;
  readonly preference: ThemePreference;
  /** The active programme tints the whole app. */
  readonly accent?: string | undefined;
}

export const ThemeProvider = ({ children, preference, accent }: Props) => {
  const systemScheme = useColorScheme();
  const theme = useMemo(() => {
    const mode =
      preference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : preference;
    return buildTheme(mode, accent);
  }, [preference, systemScheme, accent]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): Theme => {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside a <ThemeProvider>.');
  return theme;
};

type Styles = Record<string, ViewStyle | TextStyle | ImageStyle>;

/**
 * Binds a stylesheet to the theme once per theme change instead of rebuilding
 * style objects on every render.
 */
export const makeStyles =
  <T extends Styles>(factory: (theme: Theme) => T) =>
  (): T => {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
