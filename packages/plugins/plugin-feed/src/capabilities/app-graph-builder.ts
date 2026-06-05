//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, createObjectNode } from '@dxos/app-toolkit';
import { isSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Filter, Obj, Ref, Type } from '@dxos/echo';
import { AtomQuery, AtomRef } from '@dxos/echo-atom';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { FeedOperation } from '#types';
import { Magazine, Subscription } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const selectionManager = yield* Capability.get(AttentionCapabilities.Selection);
    const selectedId = Atom.family((nodeId: string) =>
      Atom.make((get) => {
        const state = get(selectionManager.state);
        const selection = state.selections[nodeId];
        return selection?.mode === 'single' ? selection.id : undefined;
      }),
    );

    const extensions = yield* Effect.all([
      // Show Magazine.Magazine objects as nodes under each space.
      GraphBuilder.createExtension({
        id: 'magazines',
        match: AppNodeMatcher.whenSpace,
        connector: (space, get) => {
          const magazines = get(AtomQuery.make(space.db, Filter.type(Magazine.Magazine)));
          if (magazines.length === 0) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            Node.make({
              id: 'magazines',
              type: 'magazines',
              data: 'magazines-root',
              properties: {
                label: 'Magazines',
                icon: 'ph--newspaper-clipping--regular',
                iconHue: 'indigo',
                role: 'branch',
                position: 'first',
                space,
              },
              nodes: magazines
                .map((magazine: Magazine.Magazine) =>
                  createObjectNode({
                    db: space.db,
                    object: magazine,
                  }),
                )
                .filter((node): node is NonNullable<typeof node> => node !== null),
            }),
          ]);
        },
      }),

      // Add-magazine action on the Magazines section header.
      GraphBuilder.createExtension({
        id: 'magazinesSectionActions',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === 'magazines' && space ? Option.some(space) : Option.none();
        },
        actions: (space) =>
          Effect.succeed([
            Node.makeAction({
              id: 'create-magazine',
              data: () =>
                Operation.invoke(SpaceOperation.OpenCreateObject, {
                  target: space.db,
                  typename: Type.getTypename(Magazine.Magazine),
                  initialFormValues: { feeds: [undefined] },
                }),
              properties: {
                label: ['add-object.label', { ns: Type.getTypename(Magazine.Magazine) }],
                icon: 'ph--plus--regular',
                disposition: 'list-item-primary',
              },
            }),
          ]),
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
              const resolved = get(AtomRef.make(ref)) as Subscription.Post | undefined;
              if (resolved?.id === postId) {
                post = resolved;
                break;
              }
            }
          }
          return Effect.succeed([
            AppNode.makeCompanion({
              id: linkedSegment('post'),
              label: ['post-companion.label', { ns: meta.id }],
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
                label: ['sync-feed.label', { ns: meta.id }],
                icon: 'ph--arrows-clockwise--regular',
                disposition: 'list-item',
              },
            },
            {
              id: 'delete',
              data: () => Operation.invoke(SpaceOperation.RemoveObjects, { objects: [feed] }),
              properties: {
                label: ['delete-object.label', { ns: Type.getTypename(Subscription.Subscription) }],
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
