//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';

import {
  DEFAULT_PLANNING_WINDOW_DAYS,
  DEFAULT_TRIP_GAP_DAYS,
  setPlanningWindowDays,
  setTripGapDays,
} from '../operations/extractor/config';
import { Settings } from '../types/Settings';

/**
 * Registers the plugin Settings (surfaced as a form via `AppCapabilities.Settings`) and bridges the
 * configured `tripGapDays` to the headless extractor: the extractor only receives a `db`, so it
 * reads the gap from a process-level holder that this module keeps in sync with the settings atom.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const settingsAtom = createKvsStore({
      key: meta.profile.key,
      schema: Settings,
      defaultValue: (): Settings => ({}),
    });

    const registry = yield* Capabilities.AtomRegistry;
    const sync = () => {
      const settings = registry.get(settingsAtom);
      setTripGapDays(settings.tripGapDays ?? DEFAULT_TRIP_GAP_DAYS);
      setPlanningWindowDays(settings.tripPlanningWindowDays ?? DEFAULT_PLANNING_WINDOW_DAYS);
    };
    sync();
    const unsubscribe = registry.subscribe(settingsAtom, sync);
    yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribe()));

    return [
      Capability.provide(AppCapabilities.Settings, {
        prefix: meta.profile.key,
        schema: Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);
