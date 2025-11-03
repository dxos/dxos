//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import {
  Capabilities,
  LayoutAction,
  type PluginContext,
  type PromiseIntentDispatcher,
  contributes,
  createIntent,
} from '@dxos/app-framework';
import { Sequence } from '@dxos/conductor';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { ROOT_ID, createExtension, rxFromSignal } from '@dxos/plugin-graph';
import { getActiveSpace } from '@dxos/plugin-space';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Query, type Space, fullyQualifiedId } from '@dxos/react-client/echo';

import { ASSISTANT_DIALOG, meta } from '../meta';
import { Assistant, AssistantAction } from '../types';

import { AssistantCapabilities } from './capabilities';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${meta.id}/root`,
      actions: (node) =>
        Rx.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) =>
              Obj.instanceOf(Assistant.Chat, node.data) ? Option.some(node.data) : Option.none(),
            ),
            Option.map((object) => {
              const id = fullyQualifiedId(object);
              return [
                {
                  id: `${AssistantAction.UpdateChatName._tag}/${id}`,
                  data: async () => {
                    const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                    await dispatch(createIntent(AssistantAction.UpdateChatName, { chat: object }));
                  },
                  properties: {
                    label: ['chat update name label', { ns: meta.id }],
                    icon: 'ph--magic-wand--regular',
                    disposition: 'list-item',
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    createExtension({
      id: `${meta.id}/assistant`,
      actions: (node) =>
        Rx.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => [
              {
                id: `${LayoutAction.UpdateDialog._tag}/assistant/open`,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  const client = context.getCapability(ClientCapabilities.Client);
                  const space = getActiveSpace(context) ?? client.spaces.default;
                  const chat = await getOrCreateChat(dispatch, space);
                  if (!chat) {
                    return;
                  }

                  await dispatch(
                    createIntent(LayoutAction.UpdateDialog, {
                      part: 'dialog',
                      subject: ASSISTANT_DIALOG,
                      options: {
                        state: true,
                        blockAlign: 'end',
                        props: {
                          chat,
                        },
                      },
                    }),
                  );
                },
                properties: {
                  label: ['open assistant label', { ns: meta.id }],
                  icon: 'ph--sparkle--regular',
                  disposition: 'pin-end',
                  position: 'hoist',
                  keyBinding: {
                    macos: 'shift+meta+k',
                    windows: 'shift+ctrl+k',
                  },
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    createExtension({
      id: `${meta.id}/companion-chat`,
      connector: (node) =>
        Rx.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (Obj.isObject(node.data) ? Option.some(node.data) : Option.none())),
            Option.map((object) => {
              const currentChat = get(
                rxFromSignal(
                  () => context.getCapability(AssistantCapabilities.State).currentChat[fullyQualifiedId(object)],
                ),
              );

              return [
                {
                  id: [fullyQualifiedId(object), 'assistant-chat'].join(ATTENDABLE_PATH_SEPARATOR),
                  type: PLANK_COMPANION_TYPE,
                  data: currentChat ?? 'assistant-chat',
                  properties: {
                    label: ['assistant chat label', { ns: meta.id }],
                    icon: 'ph--sparkle--regular',
                    position: 'hoist',
                    disposition: 'hidden',
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    createExtension({
      id: `${meta.id}/sequence-logs`,
      connector: (node) =>
        Rx.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (Obj.instanceOf(Sequence, node.data) ? Option.some(node) : Option.none())),
            Option.map((node) => [
              {
                id: [node.id, 'logs'].join(ATTENDABLE_PATH_SEPARATOR),
                type: PLANK_COMPANION_TYPE,
                data: 'logs',
                properties: {
                  label: ['sequence logs label', { ns: meta.id }],
                  icon: 'ph--clock-countdown--regular',
                  disposition: 'hidden',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);

// TODO(burdon): Factor out.
const getOrCreateChat = async (
  dispatch: PromiseIntentDispatcher,
  space: Space,
): Promise<Assistant.Chat | undefined> => {
  // TODO(wittjosiah): This should be possible with a single query.
  const { objects: allChats } = await space.db.query(Query.type(Assistant.Chat)).run();
  const { objects: relatedChats } = await space.db
    .query(Query.type(Assistant.Chat).sourceOf(Assistant.CompanionTo).source())
    .run();

  const chats = allChats.filter((chat) => !relatedChats.includes(chat));
  if (chats.length > 0) {
    return chats.at(-1);
  }

  const { data } = await dispatch(createIntent(AssistantAction.CreateChat, { space }));
  invariant(Obj.instanceOf(Assistant.Chat, data?.object));
  await dispatch(createIntent(SpaceAction.AddObject, { target: space, object: data.object }));
  return data.object;
};
