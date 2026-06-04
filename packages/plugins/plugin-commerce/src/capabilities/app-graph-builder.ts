//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNodeMatcher, createObjectNode } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Filter, Obj, Ref, Type } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';

import { meta } from '../meta';
import { Provider, Search, SearchOperation } from '../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // Show Provider.Provider objects as nodes under each space.
      GraphBuilder.createExtension({
        id: 'commerceProviders',
        match: AppNodeMatcher.whenSpace,
        connector: (space, get) => {
          const providers = get(AtomQuery.make(space.db, Filter.type(Provider.Provider)));
          if (providers.length === 0) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            // TODO(wittjosiah): Should be AppNode.makeSection() but currently has selectable data.
            Node.make({
              id: 'providers',
              type: 'providers', // TODO(burdon): Const.
              data: 'providers-root', // TODO(burdon): Const.
              properties: {
                label: ['providers.label', { ns: meta.id }],
                icon: 'ph--globe--regular',
                role: 'branch',
                position: 'first',
              },
              nodes: providers
                .map((provider: Provider.Provider) =>
                  createObjectNode({
                    db: space.db,
                    object: provider,
                  }),
                )
                .filter((node): node is NonNullable<typeof node> => node !== null),
            }),
          ]);
        },
      }),

      // Run action on each Search.Search node.
      GraphBuilder.createExtension({
        id: 'commerceRun',
        match: (node) => (Search.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        actions: (search) =>
          Effect.succeed([
            {
              id: 'run',
              data: () =>
                Operation.invoke(
                  SearchOperation.RunSearch,
                  { search: Ref.make(search) },
                  { spaceId: Obj.getDatabase(search)?.spaceId },
                ),
              properties: {
                label: ['run-search.label', { ns: meta.id }],
                icon: 'ph--shopping-cart--regular',
                disposition: 'list-item',
              },
            },
            {
              id: 'delete',
              data: () => Operation.invoke(SpaceOperation.RemoveObjects, { objects: [search] }),
              properties: {
                label: ['delete-object.label', { ns: Type.getTypename(Search.Search) }],
                icon: 'ph--trash--regular',
                disposition: 'list-item',
              },
            },
          ]),
      }),

      // Re-analyze action on each Provider.Provider node.
      GraphBuilder.createExtension({
        id: 'commerceAnalyze',
        match: (node) => (Provider.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        actions: (provider) =>
          Effect.succeed([
            {
              id: 'regenerate',
              data: () =>
                Operation.invoke(
                  SearchOperation.GenerateProviderTemplate,
                  { provider: Ref.make(provider) },
                  { spaceId: Obj.getDatabase(provider)?.spaceId },
                ),
              properties: {
                label: ['regenerate.label', { ns: meta.id }],
                icon: 'ph--sparkle--regular',
                disposition: 'toolbar',
              },
            },
            {
              id: 'delete',
              data: () => Operation.invoke(SpaceOperation.RemoveObjects, { objects: [provider] }),
              properties: {
                label: ['delete-object.label', { ns: Type.getTypename(Provider.Provider) }],
                icon: 'ph--trash--regular',
                disposition: 'list-item',
              },
            },
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
