//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, createTypeSectionExtension } from '@dxos/app-toolkit';
import { isSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Obj, Ref, Type } from '@dxos/echo';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { linkedSegment, selectionSlice } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { FeedOperation } from '#types';
import { Magazine, Subscription } from '#types';

const magazineTypename = Type.getTypename(Magazine.Magazine);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
    const selectedId = Atom.family((nodeId: string) =>
      Atom.make((get) => {
        const selection = get(viewState.atom(selectionSlice, nodeId));
        return selection.mode === 'single' ? selection.id : undefined;
      }),
    );

    const extensions = yield* Effect.all([
      createTypeSectionExtension(Magazine.Magazine, { position: 'first' }),

      // Add-magazine action on the Magazines section header.
      GraphBuilder.createExtension({
        id: 'magazinesSectionActions',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === magazineTypename && space ? Option.some(space) : Option.none();
        },
        actions: (space) =>
          Effect.succeed([
            Node.makeAction({
              id: 'create-magazine',
              data: () =>
                Operation.invoke(SpaceOperation.OpenCreateObject, {
                  target: space.db,
                  typename: magazineTypename,
                  initialFormValues: { feeds: [undefined] },
                }),
              properties: {
                label: ['add-object.label', { ns: magazineTypename }],
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
