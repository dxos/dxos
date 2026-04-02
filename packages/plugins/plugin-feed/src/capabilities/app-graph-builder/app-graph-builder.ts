//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, createObjectNode } from '@dxos/app-toolkit';
import { type Space, isSpace } from '@dxos/client/echo';
import { type Feed, Filter, Obj, Query } from '@dxos/echo';
import { AtomQuery, AtomRef } from '@dxos/echo-atom';
import { Operation } from '@dxos/operation';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
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

      // Companion panel: when a Subscription.Feed is selected, show FeedArticle.
      GraphBuilder.createExtension({
        id: `${meta.id}.subscription-feed-companion`,
        match: (node) =>
          Subscription.instanceOf(node.data)
            ? Option.some({ feed: node.data as Subscription.Feed, nodeId: node.id })
            : Option.none(),
        connector: (matched, get) => {
          const subscriptionFeed = matched.feed;
          const db = Obj.getDatabase(subscriptionFeed);
          const echoFeed = subscriptionFeed.feed
            ? (get(AtomRef.make(subscriptionFeed.feed)) as Feed.Feed | undefined)
            : undefined;
          if (!db || !echoFeed) {
            return Effect.succeed([]);
          }

          const postId = get(selectedId(matched.nodeId));
          const post = get(
            AtomQuery.make<Subscription.Post>(
              db,
              Query.select(postId ? Filter.id(postId) : Filter.nothing()).from(echoFeed),
            ),
          )[0];

          return Effect.succeed([
            {
              id: 'feed',
              type: PLANK_COMPANION_TYPE,
              data: post ?? 'feed',
              properties: {
                label: ['feed companion label', { ns: meta.id }],
                icon: 'ph--article--regular',
                disposition: 'hidden',
              },
            },
          ]);
        },
      }),

      // Sync action on each Subscription.Feed node.
      GraphBuilder.createExtension({
        id: `${meta.id}.sync-feed`,
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
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
