//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import type { PluginManager } from '@dxos/app-framework';
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
    const manager = yield* Capabilities.PluginManager;
    const registry = yield* Capabilities.AtomRegistry;
    const settingsAtom = yield* RegistryCapabilities.Settings;

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
