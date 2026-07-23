//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, Paths, TypeSection } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Obj, Ref, Type } from '@dxos/echo';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { GraphBuilder } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { linkedSegment, selectionAspect } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { FeedOperation } from '#types';
import { Magazine, Subscription } from '#types';

import { getMagazinesPath } from '../paths';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
    const selectedId = Atom.family((nodeId: string) =>
      Atom.make((get) => {
        const selection = get(viewState.atom(selectionAspect, nodeId));
        return selection.mode === 'single' ? selection.id : undefined;
      }),
    );

    const extensions = yield* Effect.all([
      // Magazine type section in the content group.
      TypeSection.createTypeSectionExtension(Magazine.Magazine, {
        urlKey: 'magazine',
        match: AppNodeMatcher.whenNavTreeGroup(Paths.GroupTypes.content),
        groupSegment: Paths.GroupSegments.content,
        createObject: (space) =>
          Operation.invoke(SpaceOperation.OpenCreateObject, {
            target: space.db,
            typename: Type.getTypename(Magazine.Magazine),
            targetNodeId: getMagazinesPath(space.db.spaceId),
          }),
      }),

      // Feeds as children under each Magazine node.
      GraphBuilder.createExtension({
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
      GraphBuilder.createExtension({
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
              id: linkedSegment('post'),
              label: ['post-companion.label', { ns: meta.profile.key }],
              icon: 'ph--article--regular',
              data: post,
            }),
          ]);
        },
      }),

      // Actions on each Subscription.Subscription node.
      GraphBuilder.createExtension({
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

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
