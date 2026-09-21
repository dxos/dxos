//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';

import {
  DEFAULT_PLANNING_WINDOW_DAYS,
  DEFAULT_TRIP_GAP_DAYS,
  setPlanningWindowDays,
  setTripGapDays,
} from '../operations/extractor/config.ts';
import { Settings } from '../types/Settings.ts';

export const TripSettings = AppCapability.settings(
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

    return Capability.contribute(AppCapabilities.Settings, {
      prefix: meta.profile.key,
      schema: Settings,
      atom: settingsAtom,
    });
  }),
  {
    activatesOn: ActivationEvents.Idle,
    requires: [Capabilities.AtomRegistry],
  },
);
