//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { meta } from '#meta';

type StatsPanelOptions = {
  /** Persist the store to localStorage (hydrate on load, save on write). */
  persist?: boolean;
};

const STORAGE_KEY = `${meta.profile.key}.statsPanel`;

/**
 * Contributes the {@link AppCapabilities.StatsPanel} store: a single reactive atom holding one
 * compartment per plugin, keyed by plugin key. Read access spans the whole store; writes are scoped
 * to a compartment via `compartment(pluginKey)`. Kept alive with `Atom.keepAlive` so a background
 * writer (e.g. a sync operation) can populate it before any surface subscribes. When `persist` is set
 * the store hydrates from and saves to localStorage so stats survive a reload.
 */
export default Capability.makeModule(
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
