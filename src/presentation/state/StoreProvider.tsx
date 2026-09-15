import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useStore } from 'zustand';

import { useContainer } from '@di/DependencyProvider';
import {
  createChallengeStore,
  type ChallengeActions,
  type ChallengeState,
  type ChallengeStore,
} from '@presentation/state/challengeStore';
import {
  createSettingsStore,
  type SettingsActions,
  type SettingsState,
  type SettingsStore,
} from '@presentation/state/settingsStore';

interface Stores {
  readonly challenge: ChallengeStore;
  readonly settings: SettingsStore;
}

const StoreContext = createContext<Stores | null>(null);

/**
 * Stores are created from the container rather than imported as singletons,
 * which is what lets a test render the whole app against fake ports.
 */
export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const container = useContainer();
  const stores = useMemo<Stores>(
    () => ({
      challenge: createChallengeStore(container),
      settings: createSettingsStore(container),
    }),
    [container],
  );

  return <StoreContext.Provider value={stores}>{children}</StoreContext.Provider>;
};

const useStores = (): Stores => {
  const stores = useContext(StoreContext);
  if (!stores) throw new Error('Stores must be used inside a <StoreProvider>.');
  return stores;
};

export const useChallenge = <T,>(selector: (state: ChallengeState & ChallengeActions) => T): T =>
  useStore(useStores().challenge, selector);

export const useSettings = <T,>(selector: (state: SettingsState & SettingsActions) => T): T =>
  useStore(useStores().settings, selector);
