//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ATTENDABLE_PATH_SEPARATOR, DECK_COMPANION_TYPE, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { ROOT_ID, createExtension, rxFromSignal } from '@dxos/plugin-graph';
import { fullyQualifiedId } from '@dxos/react-client/echo';

import { meta } from '../meta';
import { ChannelType, ThreadAction } from '../types';
import { getAnchor } from '../util';

import { ThreadCapabilities } from './capabilities';

// TODO(wittjosiah): Highlight active calls in L1.
//  Track active meetings by subscribing to meetings query and polling the swarms of recent meetings in the space.
export default (context: PluginContext) => {
  const resolve = (typename: string) =>
    context.getCapabilities(Capabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

  return contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${meta.id}/active-call`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map((node) => {
              const [call] = get(context.capabilities(ThreadCapabilities.CallManager));
              return get(
                rxFromSignal(() =>
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
              );
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
    // TODO(wittjosiah): The channel shouldn't become the companion during a call.
    //   Alternative: the call/meeting/thread should be a child node of the channel and that should be opened.
    createExtension({
      id: `${meta.id}/channel-chat-companion`,
      connector: (node) => {
        return Rx.make((get) => {
          return pipe(
            get(node),
            Option.flatMap((node) => (Obj.instanceOf(ChannelType, node.data) ? Option.some(node.data) : Option.none())),
            Option.map((channel) => {
              const callManager = context.getCapability(ThreadCapabilities.CallManager);
              const joined = get(
                rxFromSignal(() => callManager.joined && callManager.roomId === fullyQualifiedId(channel)),
              );
              if (!joined) {
                return [];
              }

              return [
                {
                  id: `${fullyQualifiedId(channel)}${ATTENDABLE_PATH_SEPARATOR}chat`,
                  type: PLANK_COMPANION_TYPE,
                  data: 'chat',
                  properties: {
                    label: ['channel companion label', { ns: meta.id }],
                    icon: 'ph--hash--regular',
                    position: 'hoist',
                    disposition: 'hidden',
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          );
        });
      },
    }),
    createExtension({
      id: `${meta.id}/comments-companion`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => {
              if (!Obj.isObject(node.data) || Obj.instanceOf(ChannelType, node.data)) {
                return Option.none();
              }
              const metadata = resolve(Obj.getTypename(node.data)!);
              return typeof metadata.comments === 'string' ? Option.some(node) : Option.none();
            }),
            Option.map((node) => [
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
            Option.getOrElse(() => []),
          ),
        ),
    }),
    createExtension({
      id: `${meta.id}/comment-toolbar`,
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => {
              if (!Obj.isObject(node.data) || Obj.instanceOf(ChannelType, node.data)) {
                return Option.none();
              }
              const metadata = resolve(Obj.getTypename(node.data)!);
              return typeof metadata.comments === 'string' ? Option.some(node.data) : Option.none();
            }),
            Option.map((object) => {
              const selectionManager = context.getCapability(AttentionCapabilities.Selection);
              const toolbar = get(context.capabilities(ThreadCapabilities.State))[0]?.state.toolbar ?? {};
              const disabled = get(
                rxFromSignal(() => {
                  const metadata = resolve(Obj.getTypename(object)!);
                  const selection = selectionManager.getSelection(fullyQualifiedId(object), metadata.selectionMode);
                  const anchor = getAnchor(selection);
                  const invalidSelection = !anchor;
                  const overlappingComment = toolbar[fullyQualifiedId(object)];
                  return (metadata.comments === 'anchored' && invalidSelection) || overlappingComment;
                }),
              );

              return [
                {
                  id: `${fullyQualifiedId(object)}/comment`,
                  data: () => {
                    const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                    const metadata = resolve(Obj.getTypename(object)!);
                    const selection = selectionManager.getSelection(fullyQualifiedId(object));
                    // TODO(wittjosiah): Use presence of selection to determine if the comment should be anchored.
                    // Requires all components which support selection (e.g. table/kanban) to support anchored comments.
                    const anchor = metadata.comments === 'anchored' ? getAnchor(selection) : Date.now().toString();
                    const name = metadata.getAnchorLabel?.(object, anchor);
                    void dispatch(createIntent(ThreadAction.Create, { anchor, name, subject: object }));
                  },
                  properties: {
                    label: ['add comment label', { ns: meta.id }],
                    icon: 'ph--chat-text--regular',
                    disposition: 'toolbar',
                    disabled,
                    testId: 'thread.comment.add',
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
};
