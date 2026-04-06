//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, createObjectNode, getActiveSpace } from '@dxos/app-toolkit';
import { type Space, isSpace } from '@dxos/client/echo';
import { Filter } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { Operation } from '@dxos/operation';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SPACE_TYPE } from '@dxos/plugin-space/types';

import { meta } from '#meta';
import { FeedOperation } from '#operations';
import { Subscription } from '#types';

const whenSpace = (node: Node.Node): Option.Option<Space> =>
  node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none();

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const resolve = (typename: string) =>
      capabilities.getAll(AppCapabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

    const selectionManager = yield* Capability.get(AttentionCapabilities.Selection);
    const selectedId = Atom.family((nodeId: string) =>
      Atom.make((get) => {
        const state = get(selectionManager.state);
        const selection = state.selections[nodeId];
        return selection?.mode === 'single' ? selection.id : undefined;
      }),
    );

    const extensions = yield* Effect.all([
      // Show Subscription.Feed objects as nodes under each space.
      GraphBuilder.createExtension({
        id: `${meta.id}.subscription-feeds`,
        match: whenSpace,
        connector: (space, get) => {
          const feeds = get(AtomQuery.make(space.db, Filter.type(Subscription.Feed)));
          if (feeds.length === 0) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            {
              id: 'feeds',
              type: 'feeds', // TODO(burdon): Const.
              data: 'feeds-root', // TODO(burdon): Const.
              properties: { label: 'Feeds', icon: 'ph--rss--regular', disposition: 'branch', position: 'hoist' },
              nodes: feeds
                .map((feed: Subscription.Feed) =>
                  createObjectNode({
                    db: space.db,
                    object: feed,
                    resolve,
                  }),
                )
                .filter((node): node is NonNullable<typeof node> => node !== null),
            },
          ]);
        },
      }),

      // Companion panel: resolve the selected feed from the SubscriptionsArticle.
      GraphBuilder.createExtension({
        id: `${meta.id}.subscription-feeds-companion`,
        match: NodeMatcher.whenNodeType('feeds'),
        connector: (matched, get) => {
          const space = getActiveSpace(capabilities.get(ClientCapabilities.Client), capabilities);
          const db = space?.db;
          if (!db) {
            return Effect.succeed([]);
          }

          // Resolve the selected feed from the attention selection.
          const feedId = get(selectedId(matched.id));
          const selectedFeed = feedId
            ? get(AtomQuery.make(db, Filter.and(Filter.type(Subscription.Feed), Filter.id(feedId))))[0]
            : undefined;

          return Effect.succeed([
            {
              id: 'feed',
              type: PLANK_COMPANION_TYPE,
              data: selectedFeed,
              properties: {
                label: ['feed-companion.label', { ns: meta.id }],
                icon: 'ph--article--regular',
                disposition: 'hidden',
              },
            },
          ]);
        },
      }),

      // Actions on each Subscription.Feed node.
      GraphBuilder.createExtension({
        id: `${meta.id}.feed-actions`,
        match: (node) =>
          Subscription.instanceOf(node.data) ? Option.some(node.data as Subscription.Feed) : Option.none(),
        actions: (feed) =>
          Effect.succeed([
            {
              id: 'sync',
              data: () => Operation.invoke(FeedOperation.SyncFeed, { feed }),
              properties: {
                label: ['sync-feed.label', { ns: meta.id }],
                icon: 'ph--arrows-clockwise--regular',
                disposition: 'list-item',
              },
            },
            {
              id: 'delete',
              data: () => Operation.invoke(SpaceOperation.RemoveObjects, { objects: [feed] }),
              properties: {
                label: ['delete-object.label', { ns: Subscription.Feed.typename }],
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
