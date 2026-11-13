//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as PluginManager from '@dxos/app-framework/PluginManager';
import * as UrlLoader from '@dxos/app-framework/UrlLoader';

import { make } from '../../plex-tutorial/dx.config.ts';

// #region make
const stash = make();

export const manager = PluginManager.make({
  plugins: [stash],
  enabled: [stash.meta.profile.key],
  // Turns an id `add` is given into a plugin; this one loads manifest URLs.
  pluginLoader: UrlLoader.make([]),
});
// #endregion

// #region start
export const start = Effect.gen(function* () {
  yield* manager.start();
  yield* manager.activate(ActivationEvents.Idle);
});
// #endregion

// #region runtime
export const toggle = (key: string) =>
  Effect.gen(function* () {
    if (manager.getEnabled().includes(key)) {
      // Also disables the plugins that depend on it.
      yield* manager.disable(key);
    } else {
      yield* manager.enable(key);
    }
  });
// #endregion

// #region url
export const loadDevPlugin = Effect.gen(function* () {
  // The plugin's own key may differ from the URL it was loaded from.
  const plugin = yield* manager.add('http://localhost:3967/manifest.json');
  yield* manager.enable(plugin.meta.profile.key);
});
// #endregion

// #region read
export const report = () => ({
  enabled: manager.getEnabled(),
  activeModules: manager.getActive(),
  failed: manager
    .getFailed()
    .map(({ id, phase, reason }) => ({ id, phase, reason })),
});

// The same state as atoms, for a component that should update.
export const enabledAtom = manager.enabled;
// #endregion
