import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ChallengePrograms, type ProgramId } from '@domain/challenge/ChallengeProgram';
import { AppText } from '@presentation/components/AppText';
import { Button } from '@presentation/components/Button';
import { Card } from '@presentation/components/Card';
import { ScreenContainer } from '@presentation/components/ScreenContainer';
import { useChallenge } from '@presentation/state/StoreProvider';
import { makeStyles, useTheme } from '@presentation/theme/ThemeProvider';

export const OnboardingScreen = () => {
  const styles = useStyles();
  const theme = useTheme();
  const programs = ChallengePrograms.all();
  const startChallenge = useChallenge((state) => state.startChallenge);
  const phase = useChallenge((state) => state.phase);

  const [selected, setSelected] = useState<ProgramId>(ChallengePrograms.default().id);
  const program = ChallengePrograms.resolve(selected);

  return (
    <ScreenContainer edges={{ top: true, bottom: true }}>
      <View style={styles.intro}>
        <AppText variant="caption" color="accent" uppercase>
          Too Hard
        </AppText>
        <AppText variant="display">75 days.</AppText>
        <AppText variant="body" color="secondary">
          Pick your rule set. Every task, every day. The app keeps score honestly — including the
          part where you start over.
        </AppText>
      </View>

      {programs.map((candidate) => {
        const isSelected = candidate.id === selected;
        return (
          <Pressable
            key={candidate.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            onPress={() => setSelected(candidate.id)}
          >
            <Card
              style={[
                styles.option,
                isSelected && { borderColor: candidate.accent, borderWidth: 2 },
              ]}
            >
              <View style={styles.optionHeader}>
                <View style={[styles.dot, { backgroundColor: candidate.accent }]} />
                <AppText variant="heading">{candidate.name}</AppText>
              </View>
              <AppText variant="caption" color="muted">
                {candidate.tagline}
              </AppText>
              <AppText variant="body" color="secondary">
                {candidate.description}
              </AppText>
              <View style={styles.taskList}>
                {candidate.tasks.map((task) => (
                  <View key={task.id} style={[styles.chip, { borderColor: theme.colors.border }]}>
                    <AppText variant="caption" color="secondary">
                      {task.emoji} {task.title}
                    </AppText>
                  </View>
                ))}
              </View>
            </Card>
          </Pressable>
        );
      })}

      <Button
        label={`Start ${program.name}`}
        loading={phase === 'loading'}
        onPress={() => void startChallenge(selected)}
      />
      <AppText variant="caption" color="muted" align="center">
        Day 1 begins today. Everything is stored on this device only.
      </AppText>
    </ScreenContainer>
  );
};

const useStyles = makeStyles((theme) => ({
  intro: { gap: theme.spacing.sm, paddingTop: theme.spacing.xl },
  option: { gap: theme.spacing.sm },
  optionHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  dot: { width: 10, height: 10, borderRadius: theme.radius.pill },
  taskList: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.xs },
  chip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
}));
