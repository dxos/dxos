//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { createKvsStore } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { ComplexMap } from '@dxos/util';

import { meta } from '../../meta';
import { SpaceCapabilities } from '../../types';

/** Default persisted state. */
const defaultSpaceState: SpaceCapabilities.SpaceState = {
  spaceNames: {},
  enabledEdgeReplication: false,
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Common.Capability.AtomRegistry);

    // Persisted state using KVS store.
    const stateAtom = createKvsStore({
      key: `${meta.id}/state`,
      schema: SpaceCapabilities.StateSchema,
      defaultValue: () => ({ ...defaultSpaceState }),
    });

    // Ephemeral state (not persisted, but kept alive to prevent GC resets).
    const ephemeralAtom = Atom.make<SpaceCapabilities.SpaceEphemeralState>({
      awaiting: undefined,
      sdkMigrationRunning: {},
      navigableCollections: false,
      viewersByObject: {},
      viewersByIdentity: new ComplexMap<PublicKey, Set<string>>(PublicKey.hash),
    }).pipe(Atom.keepAlive);

    const manager = yield* Capability.get(Common.Capability.PluginManager);
    // Update navigableCollections based on plugin state.
    const updateNavigableCollections = () => {
      const enabled = manager.getEnabled().includes('dxos.org/plugin/stack');
      const current = registry.get(ephemeralAtom);
      if (enabled !== current.navigableCollections) {
        registry.update(ephemeralAtom, (c) => ({ ...c, navigableCollections: enabled }));
      }
    };
    // Check initial state and subscribe to changes.
    updateNavigableCollections();
    const unsubscribe = registry.subscribe(manager.enabled, updateNavigableCollections);

    return [
      Capability.contributes(SpaceCapabilities.State, stateAtom),
      Capability.contributes(SpaceCapabilities.EphemeralState, ephemeralAtom, () =>
        Effect.sync(() => {
          unsubscribe();
        }),
      ),
    ];
  }),
);
