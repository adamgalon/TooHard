import { Gauge, HStack, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  opacity,
  padding,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type TodayWidgetTask = {
  readonly emoji: string;
  readonly title: string;
  readonly satisfied: boolean;
};

export type TodayWidgetProps = {
  readonly hasChallenge: boolean;
  readonly dayNumber: number;
  readonly totalDays: number;
  readonly currentStreak: number;
  readonly completedDays: number;
  readonly daysRemaining: number;
  /** 0…1 */
  readonly ratio: number;
  readonly tasks: readonly TodayWidgetTask[];
};

const TodayWidget = (props: TodayWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  // Module-scope values aren't reachable from inside a 'widget'-directive
  // function — it compiles into its own isolated bundle — so these have to be
  // declared in here, not hoisted out as constants.
  const ACCENT = '#FF4D4D';
  const BACKGROUND = '#0B0B0F';
  const MUTED = '#9A9AA2';

  if (!props.hasChallenge) {
    return (
      <ZStack
        modifiers={[
          containerBackground(BACKGROUND, 'widget'),
          frame({ maxWidth: Infinity, maxHeight: Infinity }),
          widgetURL('toohard://'),
        ]}
      >
        <VStack spacing={4} modifiers={[padding({ all: 16 })]}>
          <Text modifiers={[font({ weight: 'semibold', size: 16 }), foregroundStyle('#FFFFFF')]}>
            Too Hard
          </Text>
          <Text modifiers={[font({ size: 13 }), foregroundStyle(MUTED)]}>
            Start your 75 Hard in the app.
          </Text>
        </VStack>
      </ZStack>
    );
  }

  const streak = `🔥 ${props.currentStreak} day${props.currentStreak === 1 ? '' : 's'} streak`;

  // A small widget has roughly a third of the width, so it stacks vertically
  // and drops to one short line per value — the wide layout truncates all
  // three. The gauge never renders its own `currentValueLabel` (the renderer
  // doesn't forward children into gauges), so the day number is layered over
  // it in a ZStack instead.
  if (environment.widgetFamily === 'systemSmall') {
    return (
      <ZStack
        modifiers={[
          containerBackground(BACKGROUND, 'widget'),
          frame({ maxWidth: Infinity, maxHeight: Infinity }),
          widgetURL('toohard://'),
        ]}
      >
        <VStack spacing={8} modifiers={[padding({ all: 12 })]}>
          <ZStack>
            <Gauge
              value={props.ratio}
              min={0}
              max={1}
              modifiers={[
                gaugeStyle('circularCapacity'),
                tint(ACCENT),
                frame({ width: 74, height: 74 }),
              ]}
            />
            <Text modifiers={[font({ weight: 'bold', size: 26 }), foregroundStyle('#FFFFFF')]}>
              {props.dayNumber}
            </Text>
          </ZStack>
          <Text modifiers={[font({ weight: 'semibold', size: 13 }), foregroundStyle('#FFFFFF')]}>
            of {props.totalDays} days
          </Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(MUTED)]}>{streak}</Text>
        </VStack>
      </ZStack>
    );
  }

  const doneToday = props.tasks.filter((task) => task.satisfied).length;
  const nextUp = props.tasks.find((task) => !task.satisfied);

  return (
    <ZStack
      modifiers={[
        containerBackground(BACKGROUND, 'widget'),
        frame({ maxWidth: Infinity, maxHeight: Infinity }),
        widgetURL('toohard://'),
      ]}
    >
      <HStack spacing={16} modifiers={[padding({ all: 16 })]}>
        <ZStack>
          <Gauge
            value={props.ratio}
            min={0}
            max={1}
            modifiers={[
              gaugeStyle('circularCapacity'),
              tint(ACCENT),
              frame({ width: 72, height: 72 }),
            ]}
          />
          <Text modifiers={[font({ weight: 'bold', size: 24 }), foregroundStyle('#FFFFFF')]}>
            {props.dayNumber}
          </Text>
        </ZStack>
        <VStack alignment="leading" spacing={3}>
          <Text modifiers={[font({ weight: 'semibold', size: 17 }), foregroundStyle('#FFFFFF')]}>
            Day {props.dayNumber} of {props.totalDays}
          </Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(MUTED)]}>
            {streak} · {props.daysRemaining} to go
          </Text>
          <Text modifiers={[font({ weight: 'semibold', size: 13 }), foregroundStyle(ACCENT)]}>
            {doneToday} of {props.tasks.length} tasks done
          </Text>
          {/* Done tasks keep their colour; what's left is dimmed, so the row
              reads as a checklist without needing labels. */}
          <HStack spacing={6}>
            {props.tasks.map((task) => (
              <Text
                key={task.title}
                modifiers={[font({ size: 15 }), opacity(task.satisfied ? 1 : 0.28)]}
              >
                {task.emoji}
              </Text>
            ))}
          </HStack>
          {nextUp ? (
            <Text modifiers={[font({ size: 11 }), foregroundStyle(MUTED)]}>
              Next: {nextUp.title}
            </Text>
          ) : (
            <Text modifiers={[font({ size: 11 }), foregroundStyle('#2EC4B6')]}>
              Today is closed out.
            </Text>
          )}
        </VStack>
      </HStack>
    </ZStack>
  );
};

export default createWidget('TodayWidget', TodayWidget);
