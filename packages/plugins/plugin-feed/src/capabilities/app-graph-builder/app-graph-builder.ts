//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, createObjectNode } from '@dxos/app-toolkit';
import { type Space, isSpace } from '@dxos/client/echo';
import { Filter, Obj } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { Operation } from '@dxos/operation';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SPACE_TYPE } from '@dxos/plugin-space/types';

import { meta } from '../../meta';
import { FeedOperation } from '../../operations';
import { Subscription } from '../../types';

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
        id: `${meta.id}.subscription-feed-listing`,
        match: whenSpace,
        connector: (space, get) => {
          const feeds = get(AtomQuery.make(space.db, Filter.type(Subscription.Feed)));
          return Effect.succeed(
            feeds
              .map((feed: Subscription.Feed) =>
                createObjectNode({ db: space.db, object: feed, resolve, disposition: undefined }),
              )
              .filter((node): node is NonNullable<typeof node> => node !== null),
          );
        },
      }),

      // Companion panel: resolve the selected feed from the SubscriptionsArticle.
      GraphBuilder.createExtension({
        id: `${meta.id}.subscription-feed-companion`,
        match: (node) =>
          Subscription.instanceOf(node.data)
            ? Option.some({ feed: node.data as Subscription.Feed, nodeId: node.id })
            : Option.none(),
        connector: (matched, get) => {
          const db = Obj.getDatabase(matched.feed);
          if (!db) {
            return Effect.succeed([]);
          }

          // Resolve the selected feed from the attention selection.
          const feedId = get(selectedId(matched.nodeId));
          const selectedFeed = feedId
            ? get(AtomQuery.make(db, Filter.and(Filter.type(Subscription.Feed), Filter.id(feedId))))[0]
            : undefined;

          return Effect.succeed([
            {
              id: 'feed',
              type: PLANK_COMPANION_TYPE,
              data: selectedFeed ?? 'feed',
              properties: {
                label: ['feed companion label', { ns: meta.id }],
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
                label: ['sync feed label', { ns: meta.id }],
                icon: 'ph--arrows-clockwise--regular',
                disposition: 'list-item',
              },
            },
            {
              id: 'delete',
              data: () => Operation.invoke(SpaceOperation.RemoveObjects, { objects: [feed] }),
              properties: {
                label: ['delete object label', { ns: Subscription.Feed.typename }],
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
