//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, contributes, type PluginContext } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR, DECK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { createExtension, ROOT_ID, rxFromSignal } from '@dxos/plugin-graph';
import { fullyQualifiedId, isLiveObject } from '@dxos/react-client/echo';

import { ThreadCapabilities } from './capabilities';
import { meta, THREAD_PLUGIN } from '../meta';
import { ChannelType } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${THREAD_PLUGIN}/active-call`,
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
                            label: ['call panel label', { ns: THREAD_PLUGIN }],
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
      id: `${THREAD_PLUGIN}/channel-chat-companion`,
      connector: (node) => {
        return Rx.make((get) => {
          return pipe(
            get(node),
            Option.flatMap((node) => (isInstanceOf(ChannelType, node.data) ? Option.some(node.data) : Option.none())),
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
                    label: ['channel companion label', { ns: THREAD_PLUGIN }],
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
      id: `${meta.id}/comments`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) =>
              isLiveObject(node.data) && !isInstanceOf(ChannelType, node.data) ? Option.some(node) : Option.none(),
            ),
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
  ]);
