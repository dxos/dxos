//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { createKvsStore } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { ComplexMap } from '@dxos/util';

import { meta } from '#meta';
import { SpaceCapabilities } from '#types';

/** Default persisted state. */
const defaultSpaceState: SpaceCapabilities.SpaceState = {
  spaceNames: {},
  enabledEdgeReplication: false,
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;

    // Persisted state using KVS store.
    const stateAtom = createKvsStore({
      key: `${meta.profile.key}.state`,
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
      mergePreview: undefined,
      lastMergeAt: undefined,
    }).pipe(Atom.keepAlive);

    const manager = yield* Capabilities.PluginManager;
    // Layout is optional and lands after this module: no plugin contributes it in standalone
    // harnesses (Storybook, tests), so hoist the capability atom and let the derivation heal if and
    // when it arrives.
    const layoutCapabilityAtom = yield* Capability.atom(AppCapabilities.Layout);
    // Navigating to a collection has to show something. Two renderers answer that: plugin-stack
    // gives a collection its own article, and the mobile deck renders every `role: 'branch'` node —
    // a collection included — as a NavBranch article. With neither, the desktop deck opens the
    // collection's contents instead and the collection itself is not a target.
    const navigableCollectionsAtom = Atom.make((get) => {
      const [layoutAtom] = get(layoutCapabilityAtom);
      const isMobile = layoutAtom ? get(layoutAtom).mode === 'mobile' : false;
      return isMobile || get(manager.enabled).includes('org.dxos.plugin.stack');
    });
    const updateNavigableCollections = () => {
      const navigableCollections = registry.get(navigableCollectionsAtom);
      const current = registry.get(ephemeralAtom);
      if (navigableCollections !== current.navigableCollections) {
        registry.update(ephemeralAtom, (c) => ({ ...c, navigableCollections }));
      }
    };
    // Check initial state and subscribe to changes.
    updateNavigableCollections();
    const unsubscribe = registry.subscribe(navigableCollectionsAtom, updateNavigableCollections);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribe();
      }),
    );
    return [
      Capability.contribute(SpaceCapabilities.State, stateAtom),
      Capability.contribute(SpaceCapabilities.EphemeralState, ephemeralAtom),
    ];
  }),
);
