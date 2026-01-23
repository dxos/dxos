//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { PublicKey } from '@dxos/keys';
import { LocalStorageStore } from '@dxos/local-storage';
import { ComplexMap } from '@dxos/util';

import { meta } from '../../meta';
import { type PluginState, SpaceCapabilities } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Common.Capability.AtomRegistry);
    const store = new LocalStorageStore<PluginState>(meta.id, {
      awaiting: undefined,
      spaceNames: {},
      viewersByObject: {},
      // TODO(wittjosiah): Stop using (Complex)Map inside reactive object.
      viewersByIdentity: new ComplexMap(PublicKey.hash),
      sdkMigrationRunning: {},
      navigableCollections: false,
      enabledEdgeReplication: false,
    });

    store
      .prop({ key: 'spaceNames', type: LocalStorageStore.json<Record<string, string>>() })
      .prop({ key: 'enabledEdgeReplication', type: LocalStorageStore.bool() });

    const manager = yield* Capability.get(Common.Capability.PluginManager);
    // TODO(wittjosiah): Find a way to make this capability-based.
    const updateNavigableCollections = () => {
      const enabled = manager.getEnabled().includes('dxos.org/plugin/stack');
      if (enabled !== store.values.navigableCollections) {
        store.set({ navigableCollections: enabled });
      }
    };
    // Check initial state and subscribe to changes.
    updateNavigableCollections();
    const unsubscribe = registry.subscribe(manager.enabled, updateNavigableCollections);

    return Capability.contributes(SpaceCapabilities.State, store, () =>
      Effect.sync(() => {
        unsubscribe();
        store.close();
      }),
    );
  }),
);
