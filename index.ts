import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';

import App from './App';

// Keeps the native splash (assets/splash-icon.png) on screen until AppSplash
// explicitly releases it — see AppSplash.tsx for why that handoff matters.
// Per the SDK docs this belongs at module scope, not inside a component.
void SplashScreen.preventAutoHideAsync().catch(() => {
  // Already resolved/rejected (e.g. fast refresh) — nothing to recover from.
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
