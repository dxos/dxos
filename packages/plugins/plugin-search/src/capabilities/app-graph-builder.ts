//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Equal from 'effect/Equal';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Operation from '@dxos/compute/Operation';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { type Client } from '@dxos/react-client';
import { Attention } from '@dxos/react-ui-attention/types';

import { meta } from '#meta';
import { SearchOperation } from '#types';

// The Client capability lands before `initialize()` resolves, and `client.spaces` throws until it does.
const initializedFamily = Atom.family((client: Client) =>
  Atom.make((get) => {
    if (!client.initialized) {
      void client.waitUntilInitialized().then(() => get.setSelf(true));
    }
    return client.initialized;
  }),
);

// Keyed by reference: the family's structural key reads every accessor on the client, including the throwing ones.
// TODO(wittjosiah): Factor out.
const initializedAtom = (client: Client): Atom.Atom<boolean> => initializedFamily(Equal.byReferenceUnsafe(client));

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Reactive read: the connector may evaluate before the client module finishes
    // activating; the atom dependency re-evaluates it when the client lands.
    const clientAtom = yield* Capability.atom(ClientCapabilities.Client);
    // Layout is optional: in standalone harnesses (Storybook, tests) no plugin contributes
    // `AppCapabilities.Layout`; hoisting the atom lets the connector heal reactively if it lands.
    const layoutCapabilityAtom = yield* Capability.atom(AppCapabilities.Layout);
    const extensions = yield* Effect.all([
      AppGraphBuilder.createExtension({
        id: 'spaceSearch',
        match: GraphNodeMatcher.whenRoot,
        connector: (_node, get) =>
          Effect.sync(() => {
            const [client] = get(clientAtom);
            const [layoutAtom] = get(layoutCapabilityAtom);
            const layout = layoutAtom ? get(layoutAtom) : undefined;
            const spaceId = layout?.workspace ? GraphPath.getSpaceIdFromPath(layout.workspace) : undefined;
            const space = client && spaceId && get(initializedAtom(client)) ? client.spaces.get(spaceId) : undefined;

            return [
              AppNode.makeDeckCompanion({
                id: Attention.linkedSegment('search'),
                label: ['search.label', { ns: meta.profile.key }],
                icon: 'ph--magnifying-glass--regular',
                data: space ?? null,
              }),
            ];
          }),
      }),
      AppGraphBuilder.createExtension({
        id: 'root',
        match: GraphNodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            {
              id: SearchOperation.OpenSearch.meta.key,
              data: Effect.fnUntraced(function* () {
                yield* Operation.invoke(SearchOperation.OpenSearch);
                return false;
              }),
              properties: {
                label: ['search-action.label', { ns: meta.profile.key }],
                icon: 'ph--magnifying-glass--regular',
                keyBinding: {
                  macos: 'meta+k',
                  windows: 'ctrl+k',
                },
              },
            },
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
