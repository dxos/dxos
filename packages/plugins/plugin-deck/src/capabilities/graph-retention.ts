//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import type * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { DeckCapabilities } from '#types';

import { DEFAULT_LOADED_WORKSPACES, evictableWorkspaces } from '../util';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    const ephemeralAtom = yield* DeckCapabilities.EphemeralState;
    const settingsAtom = yield* DeckCapabilities.Settings;

    const retention: AppGraphBuilder.Retention = {
      // Read straight from the deck's own atoms: the visit order, the exemptions and the limit all
      // already live here, so the builder holds no second copy of any of it. Called once per settled
      // flush, so this stays two synchronous reads and a slice.
      evictable: () =>
        evictableWorkspaces(
          registry.get(ephemeralAtom).recentWorkspaces,
          registry.get(settingsAtom).loadedWorkspaces ?? DEFAULT_LOADED_WORKSPACES,
        ),
    };

    return Capability.contribute(AppCapabilities.AppGraphRetention, retention);
  }),
);
