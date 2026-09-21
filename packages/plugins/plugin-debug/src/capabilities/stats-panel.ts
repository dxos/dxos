//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { meta } from '#meta';
import { Debug } from '#types';
import { DebugEvents } from '#types';

type StatsPanelOptions = {
  /** Persist the store to localStorage (hydrate on load, save on write). */
  persist?: boolean;
};

const STORAGE_KEY = `${meta.profile.key}.statsPanel`;

export const StatsPanel = Capability.makeModule(
  'StatsPanel',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [AppCapabilities.StatsPanel],
    props: ({ persistStats }: Debug.DebugPluginOptions) => ({ persist: persistStats ?? true }),
    activatesOn: DebugEvents.Start,
  },
  Effect.fnUntraced(function* ({ persist = true }: StatsPanelOptions = {}) {
    const registry = yield* Capabilities.AtomRegistry;
    const canPersist = persist && typeof localStorage !== 'undefined';

    const hydrate = (): Record<string, unknown> => {
      if (!canPersist) {
        return {};
      }
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch {
        // Best-effort: a malformed/unavailable value just starts empty.
        return {};
      }
    };

    const statsAtom = Atom.make<Record<string, unknown>>(hydrate()).pipe(Atom.keepAlive);

    const save = () => {
      if (!canPersist) {
        return;
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(registry.get(statsAtom)));
      } catch {
        // Best-effort: localStorage may be disabled or over quota; the in-memory atom is authoritative.
      }
    };

    return Capability.contribute(AppCapabilities.StatsPanel, {
      statsAtom,
      get: (pluginKey) => registry.get(statsAtom)[pluginKey],
      compartment: (pluginKey) => ({
        set: (stats) => {
          registry.set(statsAtom, { ...registry.get(statsAtom), [pluginKey]: stats });
          save();
        },
        clear: () => {
          const { [pluginKey]: _removed, ...rest } = registry.get(statsAtom);
          registry.set(statsAtom, rest);
          save();
        },
      }),
    });
  }),
);
