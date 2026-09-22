import type { ReactNode } from 'react';
import { Keyboard, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, useTheme } from '@presentation/theme/ThemeProvider';

interface Props {
  readonly children: ReactNode;
  readonly scroll?: boolean;
  readonly refreshing?: boolean;
  readonly onRefresh?: () => void;
  /** Tab bar already reserves the bottom inset. */
  readonly edges?: { top?: boolean; bottom?: boolean };
}

export const ScreenContainer = ({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  edges = { top: true, bottom: false },
}: Props) => {
  const styles = useStyles();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const padding = {
    paddingTop: edges.top === false ? theme.spacing.lg : insets.top + theme.spacing.md,
    paddingBottom: edges.bottom ? insets.bottom + theme.spacing.xl : theme.spacing.xxxl,
  };

  if (!scroll) {
    return <View style={[styles.root, padding, styles.padded]}>{children}</View>;
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.padded, padding]}
      keyboardShouldPersistTaps="handled"
      // The keyboard can cover most of the screen (a multiline note field has
      // no return-key way to close it), so the scroll gesture itself — not
      // just a tap on whatever sliver of empty space is left — dismisses it.
      onScrollBeginDrag={Keyboard.dismiss}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
};

const useStyles = makeStyles((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  padded: { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.lg },
}));
