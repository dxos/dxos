//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { log } from '@dxos/log';

import { RegistryCapabilities } from '../types';

/**
 * Startup module that auto-loads a locally-served dev plugin when the user has
 * the toggle enabled in registry settings. Failures (dev server offline, 404,
 * timeout) are logged and swallowed so a stale dev URL never blocks app boot —
 * the toggle stays on, the next reload retries.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const manager = yield* Capability.get(Capabilities.PluginManager);
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const settingsAtom = yield* Capability.get(RegistryCapabilities.Settings);

    const settings = registry.get(settingsAtom);
    const url = settings.devPluginUrl?.trim();
    if (!settings.devPluginEnabled || !url) {
      return [];
    }

    log.info('loading dev plugin from registry settings', { url });
    yield* manager.add(url).pipe(
      Effect.flatMap((plugin) => manager.enable(plugin.meta.profile.key)),
      Effect.tapError((error) => Effect.sync(() => log.warn('dev plugin auto-load failed', { url, error }))),
      Effect.ignore,
    );

    return [];
  }),
);
