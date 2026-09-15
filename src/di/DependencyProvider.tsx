import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

import { createContainer, type ContainerOverrides } from '@di/createContainer';
import type { AppContainer, UseCases } from '@di/types';

const DependencyContext = createContext<AppContainer | null>(null);

interface Props {
  readonly children: ReactNode;
  /** Tests and previews pass a container built from fakes. */
  readonly container?: AppContainer;
  readonly overrides?: ContainerOverrides;
}

export const DependencyProvider = ({ children, container, overrides }: Props) => {
  const value = useMemo(
    () => container ?? createContainer(overrides),
    [container, overrides],
  );

  useEffect(() => () => value.dispose(), [value]);

  return <DependencyContext.Provider value={value}>{children}</DependencyContext.Provider>;
};

export const useContainer = (): AppContainer => {
  const container = useContext(DependencyContext);
  if (!container) {
    throw new Error('useContainer must be used inside a <DependencyProvider>.');
  }
  return container;
};

export const useUseCases = (): UseCases => useContainer().useCases;
