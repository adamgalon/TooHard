import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, LinearGradient, Stop } from 'react-native-svg';
import * as SplashScreen from 'expo-splash-screen';

/**
 * The branded boot screen, shown while `expo-splash-screen`'s native splash
 * hands off to the app and while the first `synchronize`/`loadSettings`
 * round trip resolves.
 *
 * Design constraint that shapes everything below: the native splash
 * (`assets/splash-icon.png`, backgroundColor `#0B0B0F`) already shows the
 * ring and "75" numeral fully drawn — it's a static image, there is no other
 * option. If this component animated that same ring in *from empty*, the
 * handoff would read as a rewind (finished → blank → redrawing), which looks
 * broken rather than polished. So the ring and numeral render already
 * settled, pixel-for-pixel the same composition as the native asset, and the
 * only things this component actually animates are elements the native
 * splash never had: the wordmark rising into place, the tagline fading in
 * underneath it, and — once those have settled — a slow breathing glow that
 * keeps the screen feeling alive if storage takes longer than usual to read.
 *
 * Colours are hardcoded rather than pulled from the theme on purpose: this
 * is a fixed brand moment that must look identical regardless of the
 * device's light/dark setting, exactly like the native splash it continues
 * from. Keep RED/ORANGE/INK in sync with `assets/brand/generate-icons.mjs`
 * if the mark ever changes — that script is the source of truth for the
 * static assets, this component is its animated continuation.
 */

const INK = '#0B0B0F';
const RED = '#FF4D4D';
const ORANGE = '#FF9F1C';
const RING_PROGRESS = 0.78; // matches assets/splash-icon.png exactly

const RING_SIZE = 132;
const RING_STROKE = 14;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_DASH_OFFSET = CIRCUMFERENCE * (1 - RING_PROGRESS);

export interface AppSplashProps {
  /** Fires once the entrance choreography has fully played out. */
  readonly onIntroComplete?: () => void;
}

export const AppSplash = ({ onIntroComplete }: AppSplashProps) => {
  // `useState`'s lazy initializer (rather than `useRef(...).current`) keeps
  // one stable Animated.Value across renders without tripping the
  // react-hooks/refs rule: Animated.Value is a deliberate escape hatch built
  // to be read during render (that's how its interpolations feed styles),
  // which the ref-during-render check has no way to know — this sidesteps
  // that friction honestly, with no behavioural difference, since the
  // setters below are never called.
  const [wordmark] = useState(() => new Animated.Value(0));
  const [tagline] = useState(() => new Animated.Value(0));
  const [breathe] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // This component's first paint IS the replacement for the native splash
    // (see the module doc above), so it owns dismissing it — a fade on iOS
    // (Android ignores `fade`; the swap is already seamless there since both
    // layers share the same dark background and composition), then release
    // the native layer once this screen has something on screen to show.
    // The fade transition needs a development or production build — Expo Go
    // logs a warning and no-ops it, which is fine: hideAsync() still works
    // there, the handoff just loses the 400ms cross-fade on iOS.
    try {
      SplashScreen.setOptions({ duration: 400, fade: true });
    } catch {
      // Best-effort: an unsupported platform/timing just skips the fade.
    }
    void SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    // The breathing loop is indefinite by design (it keeps the screen alive
    // if storage is slow), which makes it the one animation here that
    // *must* be stopped explicitly — left running, it would keep ticking
    // forever in the background after this screen unmounts, animating a
    // value nothing renders any more. `cancelled` also guards the gap
    // between the entrance finishing and this effect's cleanup: if the app
    // becomes ready and unmounts AppSplash in that exact window, the loop
    // must never start at all.
    let cancelled = false;
    let loop: Animated.CompositeAnimation | null = null;

    const entrance = Animated.stagger(160, [
      Animated.timing(wordmark, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(tagline, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    entrance.start(({ finished }) => {
      if (!finished || cancelled) return;
      onIntroComplete?.();
      // A slow, indefinite breathe on the glow — the only cue, once the
      // intro has settled, that something is still happening if a cold
      // device is slow to read from storage.
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, {
            toValue: 1,
            duration: 1900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(breathe, {
            toValue: 0,
            duration: 1900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
    });

    return () => {
      cancelled = true;
      entrance.stop();
      loop?.stop();
    };
  }, [wordmark, tagline, breathe, onIntroComplete]);

  const wordmarkStyle = {
    opacity: wordmark,
    transform: [
      {
        translateY: wordmark.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
      },
    ],
  };
  const taglineStyle = {
    opacity: tagline,
    transform: [
      {
        translateY: tagline.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
      },
    ],
  };
  const glowStyle = {
    opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }),
    transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }],
  };

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.ringWrap, glowStyle]}>
        <Svg width={RING_SIZE * 1.8} height={RING_SIZE * 1.8} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="splashGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={ORANGE} stopOpacity={0.32} />
              <Stop offset="60%" stopColor={RED} stopOpacity={0.12} />
              <Stop offset="100%" stopColor={RED} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle
            cx={(RING_SIZE * 1.8) / 2}
            cy={(RING_SIZE * 1.8) / 2}
            r={RING_SIZE * 0.85}
            fill="url(#splashGlow)"
          />
        </Svg>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Defs>
            <LinearGradient id="splashRing" x1="15%" y1="10%" x2="85%" y2="95%">
              <Stop offset="0%" stopColor={RED} />
              <Stop offset="100%" stopColor={ORANGE} />
            </LinearGradient>
          </Defs>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke="rgba(255,255,255,0.09)"
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke="url(#splashRing)"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={RING_DASH_OFFSET}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>
        <View style={styles.numeralWrap} pointerEvents="none">
          <Animated.Text style={styles.numeral}>75</Animated.Text>
        </View>
      </Animated.View>

      <Animated.Text style={[styles.wordmark, wordmarkStyle]}>TOO HARD</Animated.Text>
      <Animated.Text style={[styles.tagline, taglineStyle]}>75 days. No exceptions.</Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrap: {
    width: RING_SIZE * 1.8,
    height: RING_SIZE * 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  numeralWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeral: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    color: '#FFFFFF',
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 5,
    color: '#FFFFFF',
  },
  tagline: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.55)',
  },
});
