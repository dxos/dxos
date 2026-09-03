//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as TypeSection from '@dxos/app-toolkit/TypeSection';
import * as Operation from '@dxos/compute/Operation';
import { Obj, Ref, Type } from '@dxos/echo';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Selection } from '@dxos/react-ui-attention/types';

import { meta } from '#meta';
import { FeedOperation, Magazine, Subscription } from '#types';

import { getMagazinesPath } from '../paths.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const viewState = yield* AttentionCapabilities.ViewState;
    const selectedId = Atom.family((nodeId: string) =>
      Atom.make((get) => {
        const selection = get(viewState.atom(Selection.aspect, nodeId));
        return selection.mode === 'single' ? selection.id : undefined;
      }),
    );

    const extensions = yield* Effect.all([
      // Magazine type section in the content group.
      TypeSection.createTypeSectionExtension(Magazine.Magazine, {
        urlKey: 'magazine',
        match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.content),
        groupSegment: GraphPath.GroupSegments.content,
        createObject: (space) =>
          Operation.invoke(SpaceOperation.OpenObjectForm, {
            target: space.db,
            typename: Type.getTypename(Magazine.Magazine),
            targetNodeId: getMagazinesPath(space.db.spaceId),
          }),
      }),

      // Feeds as children under each Magazine node.
      AppGraphBuilder.createExtension({
        id: 'magazineFeeds',
        match: (node) => (Magazine.instanceOf(node.data) ? Option.some(node.data as Magazine.Magazine) : Option.none()),
        connector: (magazine, get) => {
          const db = Obj.getDatabase(magazine);
          if (!db) {
            return Effect.succeed([]);
          }
          const feedRefs = get(Obj.atomProperty(magazine, 'feeds'));
          const feeds = feedRefs
            .map((ref) => get(ref.atom))
            .filter((feed): feed is Subscription.Subscription => Subscription.instanceOf(feed));
          return Effect.succeed(
            feeds
              .map((feed) => AppNode.makeObject({ get, db, object: feed }))
              .filter((node): node is NonNullable<typeof node> => node !== null),
          );
        },
      }),

      // Companion panel: resolve the selected Post under a Magazine node.
      AppGraphBuilder.createExtension({
        id: 'magazinePost',
        match: (node) =>
          Magazine.instanceOf(node.data)
            ? Option.some({ magazine: node.data as Magazine.Magazine, nodeId: node.id })
            : Option.none(),
        connector: (matched, get) => {
          const { magazine, nodeId } = matched;
          const postId = get(selectedId(nodeId));
          let post: Subscription.Post | undefined;
          if (postId) {
            for (const ref of magazine.posts) {
              const resolved = get(ref.atom) as Subscription.Post | undefined;
              if (resolved?.id === postId) {
                post = resolved;
                break;
              }
            }
          }
          return Effect.succeed([
            AppNode.makeCompanion({
              variant: 'post',
              label: ['post-companion.label', { ns: meta.profile.key }],
              icon: 'ph--article--regular',
              data: post,
            }),
          ]);
        },
      }),

      // Actions on each Subscription.Subscription node.
      AppGraphBuilder.createExtension({
        id: 'feedActions',
        match: (node) =>
          Subscription.instanceOf(node.data) ? Option.some(node.data as Subscription.Subscription) : Option.none(),
        actions: (feed) =>
          Effect.succeed([
            {
              id: 'sync',
              data: () =>
                Operation.invoke(
                  FeedOperation.SyncFeed,
                  { feed: Ref.make(feed) },
                  { spaceId: Obj.getDatabase(feed)?.spaceId },
                ),
              properties: {
                label: ['sync-feed.label', { ns: meta.profile.key }],
                icon: 'ph--arrows-clockwise--regular',
                disposition: 'list-item',
              },
            },
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
