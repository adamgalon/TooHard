import { createStore, type StoreApi } from 'zustand/vanilla';

import { DEFAULT_SETTINGS, type AppSettings } from '@domain/settings/AppSettings';
import type { SettingsPatch } from '@application/use-cases/ManageSettings';
import type { AppContainer } from '@di/types';

export interface SettingsState {
  readonly settings: AppSettings;
  readonly loaded: boolean;
}

export interface SettingsActions {
  load(): Promise<void>;
  update(patch: SettingsPatch): Promise<void>;
}

export type SettingsStore = StoreApi<SettingsState & SettingsActions>;

export const createSettingsStore = (container: AppContainer): SettingsStore =>
  createStore<SettingsState & SettingsActions>((set) => {
    /** Adapters read preferences through a live cell, so keep it in step. */
    const publish = (settings: AppSettings): void => {
      container.preferences.hapticsEnabled.set(settings.hapticsEnabled);
      set({ settings, loaded: true });
    };

    return {
      settings: DEFAULT_SETTINGS,
      loaded: false,

      async load() {
        const loaded = await container.useCases.loadSettings.execute();
        publish(loaded.ok ? loaded.value : DEFAULT_SETTINGS);
      },

      async update(patch) {
        const updated = await container.useCases.updateSettings.execute(patch);
        if (updated.ok) publish(updated.value);
        else container.logger.log('warn', 'Could not save settings.', { code: updated.error.code });
      },
    };
  });
