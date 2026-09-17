import { Alert, Pressable, View } from 'react-native';

import type { ThemePreference } from '@domain/settings/AppSettings';
import { AppText } from '@presentation/components/AppText';
import { Button } from '@presentation/components/Button';
import { Card } from '@presentation/components/Card';
import { ChoiceGroup } from '@presentation/components/ChoiceGroup';
import { ScreenContainer } from '@presentation/components/ScreenContainer';
import { SettingRow } from '@presentation/components/SettingRow';
import { useChallenge, useSettings } from '@presentation/state/StoreProvider';
import { makeStyles } from '@presentation/theme/ThemeProvider';

const pad = (value: number): string => value.toString().padStart(2, '0');

export const SettingsScreen = () => {
  const styles = useStyles();
  const settings = useSettings((state) => state.settings);
  const update = useSettings((state) => state.update);
  const dashboard = useChallenge((state) => state.dashboard);
  const endChallenge = useChallenge((state) => state.endChallenge);
  const backupData = useChallenge((state) => state.backupData);
  const restoreData = useChallenge((state) => state.restoreData);
  const backupInFlight = useChallenge((state) => state.backupInFlight);

  const shiftReminder = (deltaMinutes: number): void => {
    const total = (settings.reminder.hour * 60 + settings.reminder.minute + deltaMinutes + 1440) % 1440;
    void update({ reminder: { hour: Math.floor(total / 60), minute: total % 60 } });
  };

  const confirmEnd = (): void => {
    Alert.alert(
      'End this challenge?',
      'Your current attempt and its daily logs are deleted. This cannot be undone.',
      [
        { text: 'Keep going', style: 'cancel' },
        { text: 'End challenge', style: 'destructive', onPress: () => void endChallenge() },
      ],
    );
  };

  const confirmRestore = (): void => {
    Alert.alert(
      'Restore from backup?',
      'This replaces everything currently on your device — your active challenge, every daily log, and your settings — with what is in the backup file you pick next.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Choose a file…', style: 'destructive', onPress: () => void restoreData() },
      ],
    );
  };

  return (
    <ScreenContainer>
      <AppText variant="title">Settings</AppText>

      <Card style={styles.section}>
        <AppText variant="heading">Appearance</AppText>
        <ChoiceGroup<ThemePreference>
          selected={settings.themePreference}
          onSelect={(themePreference) => void update({ themePreference })}
          choices={[
            { value: 'system', label: 'System' },
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]}
        />
      </Card>

      <Card style={styles.section}>
        <AppText variant="heading">Daily rhythm</AppText>
        <SettingRow
          kind="switch"
          title="Evening reminder"
          description="A nudge to close out the day before midnight."
          value={settings.reminderEnabled}
          onValueChange={(reminderEnabled) => void update({ reminderEnabled })}
        />
        {settings.reminderEnabled ? (
          <View style={styles.timeRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Earlier"
              onPress={() => shiftReminder(-30)}
              style={styles.timeButton}
            >
              <AppText variant="heading">−</AppText>
            </Pressable>
            <AppText variant="title">
              {pad(settings.reminder.hour)}:{pad(settings.reminder.minute)}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Later"
              onPress={() => shiftReminder(30)}
              style={styles.timeButton}
            >
              <AppText variant="heading">+</AppText>
            </Pressable>
          </View>
        ) : null}
        <SettingRow
          kind="switch"
          title="Haptics"
          description="A tap when a task lands, a jolt when a day is lost."
          value={settings.hapticsEnabled}
          onValueChange={(hapticsEnabled) => void update({ hapticsEnabled })}
        />
      </Card>

      <Card style={styles.section}>
        <AppText variant="heading">Your data</AppText>
        <AppText variant="caption" color="muted">
          Everything stays on this device. Back up to a file you control — iCloud Drive, Google
          Drive, AirDrop — so a lost phone doesn&apos;t mean a lost streak.
        </AppText>
        <Button
          label="Back up now"
          variant="secondary"
          loading={backupInFlight}
          onPress={() => void backupData()}
        />
        <Button
          label="Restore from a backup"
          variant="secondary"
          loading={backupInFlight}
          onPress={confirmRestore}
        />
      </Card>

      {dashboard ? (
        <Card style={styles.section}>
          <AppText variant="heading">Current challenge</AppText>
          <AppText variant="body" color="secondary">
            {dashboard.programName} · day {dashboard.dayNumber} of {dashboard.totalDays} · attempt{' '}
            {dashboard.attempt}
          </AppText>
          <Button label="End challenge" variant="danger" onPress={confirmEnd} />
        </Card>
      ) : null}

      <Card style={styles.section}>
        <AppText variant="heading">About</AppText>
        <AppText variant="body" color="secondary">
          Too Hard keeps everything on your device. No account, no sync, no leaderboard — the only
          person you are answering to is you.
        </AppText>
      </Card>
    </ScreenContainer>
  );
};

const useStyles = makeStyles((theme) => ({
  section: { gap: theme.spacing.md },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
  },
  timeButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
}));
