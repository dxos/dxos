//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability, Common } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ATTENDABLE_PATH_SEPARATOR, DECK_COMPANION_TYPE, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { CreateAtom, GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

import { meta } from '../../meta';
import { Channel, ThreadCapabilities, ThreadOperation } from '../../types';
import { getAnchor } from '../../util';

// TODO(wittjosiah): Highlight active calls in L1.
//  Track active meetings by subscribing to meetings query and polling the swarms of recent meetings in the space.
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const resolve = (typename: string) =>
      capabilities.getAll(Common.Capability.Metadata).find(({ id }: { id: string }) => id === typename)?.metadata ?? {};

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: `${meta.id}/active-call`,
        match: NodeMatcher.whenRoot,
        connector: (node, get) => {
          const callManagerAtom = capabilities.atom(ThreadCapabilities.CallManager);
          const [call] = get(callManagerAtom);
          return Effect.succeed(
            get(
              CreateAtom.fromSignal(() =>
                call?.joined
                  ? [
                      {
                        id: `${node.id}${ATTENDABLE_PATH_SEPARATOR}active-call`,
                        type: DECK_COMPANION_TYPE,
                        data: null,
                        properties: {
                          label: ['call panel label', { ns: meta.id }],
                          icon: 'ph--video-conference--regular',
                          position: 'hoist',
                          disposition: 'hidden',
                        },
                      },
                    ]
                  : [],
              ),
            ),
          );
        },
      }),
      GraphBuilder.createTypeExtension({
        id: `${meta.id}/channel-chat-companion`,
        type: Channel.Channel,
        connector: (channel, get) => {
          const callManager = capabilities.get(ThreadCapabilities.CallManager);
          const joined = get(
            CreateAtom.fromSignal(() => callManager.joined && callManager.roomId === Obj.getDXN(channel).toString()),
          );
          if (!joined) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            {
              id: `${Obj.getDXN(channel).toString()}${ATTENDABLE_PATH_SEPARATOR}chat`,
              type: PLANK_COMPANION_TYPE,
              data: 'chat',
              properties: {
                label: ['channel companion label', { ns: meta.id }],
                icon: 'ph--hash--regular',
                position: 'hoist',
                disposition: 'hidden',
              },
            },
          ]);
        },
      }),
      GraphBuilder.createExtension({
        id: `${meta.id}/comments-companion`,
        match: (node) => {
          if (!Obj.isObject(node.data) || Obj.instanceOf(Channel.Channel, node.data)) {
            return Option.none();
          }
          const metadata = resolve(Obj.getTypename(node.data)!);
          return typeof metadata.comments === 'string' ? Option.some(node) : Option.none();
        },
        connector: (node) =>
          Effect.succeed([
            {
              id: [node.id, 'comments'].join(ATTENDABLE_PATH_SEPARATOR),
              type: PLANK_COMPANION_TYPE,
              data: 'comments',
              properties: {
                label: ['comments label', { ns: meta.id }],
                icon: 'ph--chat-text--regular',
                disposition: 'hidden',
                position: 'hoist',
              },
            },
          ]),
      }),
      GraphBuilder.createExtension({
        id: `${meta.id}/comment-toolbar`,
        match: (node) => {
          if (!Obj.isObject(node.data) || Obj.instanceOf(Channel.Channel, node.data)) {
            return Option.none();
          }
          const metadata = resolve(Obj.getTypename(node.data)!);
          return typeof metadata.comments === 'string' ? Option.some(node.data) : Option.none();
        },
        actions: (object, get) => {
          const stateAtom = capabilities.atom(ThreadCapabilities.State);
          const toolbar = get(stateAtom)[0]?.state.toolbar ?? {};
          const selectionManager = capabilities.get(AttentionCapabilities.Selection);
          const disabled = get(
            CreateAtom.fromSignal(() => {
              const metadata = resolve(Obj.getTypename(object)!);
              const selection = selectionManager.getSelection(Obj.getDXN(object).toString(), metadata.selectionMode);
              const anchor = getAnchor(selection);
              const invalidSelection = !anchor;
              const overlappingComment = toolbar[Obj.getDXN(object).toString()];
              return (metadata.comments === 'anchored' && invalidSelection) || overlappingComment;
            }),
          );

          return Effect.succeed([
            {
              id: `${Obj.getDXN(object).toString()}/comment`,
              data: Effect.fnUntraced(function* () {
                const metadata = resolve(Obj.getTypename(object)!);
                const selection = selectionManager.getSelection(Obj.getDXN(object).toString());
                const anchor = metadata.comments === 'anchored' ? getAnchor(selection) : Date.now().toString();
                const name = metadata.getAnchorLabel?.(object, anchor);
                yield* Operation.invoke(ThreadOperation.Create, {
                  anchor,
                  name,
                  subject: object,
                });
              }),
              properties: {
                label: ['add comment label', { ns: meta.id }],
                icon: 'ph--chat-text--regular',
                disposition: 'toolbar',
                disabled,
                testId: 'thread.comment.add',
              },
            },
          ]);
        },
      }),
    ]);

    return Capability.contributes(Common.Capability.AppGraphBuilder, extensions);
  }),
);
