//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { SubscriptionList } from '@dxos/async';
import { log } from '@dxos/log';

import { NativeCapabilities, Settings } from '#types';

/**
 * Synchronizes the configured spotlight shortcut from plugin settings to the Tauri backend.
 *
 * Invokes the `set_spotlight_shortcut` command whenever the value changes. The command is
 * a no-op when the requested shortcut is already bound, so calling it on activation with
 * the default value is safe and never disturbs the startup registration.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const settingsAtom = yield* Capability.get(NativeCapabilities.Settings);

    const subscriptions = new SubscriptionList();
    const { invoke } = yield* Effect.promise(() => import('@tauri-apps/api/core'));

    let lastApplied: string | undefined;
    const apply = async () => {
      const next = registry.get(settingsAtom).spotlightShortcut ?? Settings.DEFAULT_SPOTLIGHT_SHORTCUT;
      if (next === lastApplied) {
        return;
      }
      try {
        await invoke('set_spotlight_shortcut', { shortcut: next });
        lastApplied = next;
      } catch (err) {
        log.warn('Failed to apply spotlight shortcut', { shortcut: next, err });
      }
    };

    void apply();
    subscriptions.add(registry.subscribe(settingsAtom, () => void apply()));

    return Capability.contributes(Capabilities.Null, null, () =>
      Effect.sync(() => {
        subscriptions.clear();
      }),
    );
  }),
);
