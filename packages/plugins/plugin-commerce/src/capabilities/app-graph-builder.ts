//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as Operation from '@dxos/compute/Operation';
import { Filter, Obj, Ref, Type } from '@dxos/echo';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { Provider, Search, SearchOperation } from '#types';

import { getProvidersSectionId } from '../paths';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // Show Provider.Provider objects as nodes under each space.
      AppGraphBuilder.createExtension({
        id: 'commerceProviders',
        url: { key: 'commerce', kind: 'item', path: [] },
        match: AppNodeMatcher.whenSpace,
        connector: (space, get) => {
          const providers = get(space.db.query(Filter.type(Provider.Provider)).atom);
          if (providers.length === 0) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            // TODO(wittjosiah): Should be AppNode.makeSection() but currently has selectable data.
            AppGraphNode.make({
              // The segment is shared with the navigation resolver, which spells provider paths.
              id: getProvidersSectionId(),
              type: 'providers', // TODO(burdon): Const.
              data: 'providers-root', // TODO(burdon): Const.
              properties: {
                label: ['providers.label', { ns: meta.profile.key }],
                icon: 'ph--globe--regular',
                role: 'branch',
                position: Position.first,
              },
              nodes: providers
                .map((provider: Provider.Provider) =>
                  AppNode.makeObject({
                    get,
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
      AppGraphBuilder.createExtension({
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
                label: ['run-search.label', { ns: meta.profile.key }],
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
      AppGraphBuilder.createExtension({
        id: 'commerceAnalyze',
        match: (node) => (Provider.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        actions: (provider) =>
          Effect.succeed([
            AppNode.makeToolbarAction({
              id: 'regenerate',
              data: () =>
                Operation.invoke(
                  SearchOperation.GenerateProviderTemplate,
                  { provider: Ref.make(provider) },
                  { spaceId: Obj.getDatabase(provider)?.spaceId },
                ),
              label: ['regenerate.label', { ns: meta.profile.key }],
              icon: 'ph--sparkle--regular',
            }),
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

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
