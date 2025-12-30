//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { Capability, Common, type PromiseIntentDispatcher, createIntent } from '@dxos/app-framework';
import { Prompt } from '@dxos/blueprints';
import { Sequence } from '@dxos/conductor';
import { DXN, type Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { CreateAtom, GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { getActiveSpace } from '@dxos/plugin-space';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Query } from '@dxos/react-client/echo';

import { ASSISTANT_DIALOG, meta } from '../../meta';
import { Assistant, AssistantAction, AssistantCapabilities } from '../../types';

export default Capability.makeModule((context) =>
  Effect.sync(() => {
    return Capability.contributes(Common.Capability.AppGraphBuilder, [
      GraphBuilder.createTypeExtension({
        id: `${meta.id}/root`,
        type: Assistant.Chat,
        actions: (chat) => {
          const id = Obj.getDXN(chat).toString();
          return [
            {
              id: `${AssistantAction.UpdateChatName._tag}/${id}`,
              data: async () => {
                const { dispatchPromise: dispatch } = context.getCapability(Common.Capability.IntentDispatcher);
                await dispatch(createIntent(AssistantAction.UpdateChatName, { chat }));
              },
              properties: {
                label: ['chat update name label', { ns: meta.id }],
                icon: 'ph--magic-wand--regular',
                disposition: 'list-item',
              },
            },
          ];
        },
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}/assistant`,
        match: NodeMatcher.whenRoot,
        actions: () => [
          {
            id: `${Common.LayoutAction.UpdateDialog._tag}/assistant/open`,
            data: async () => {
              const { dispatchPromise: dispatch } = context.getCapability(Common.Capability.IntentDispatcher);
              const client = context.getCapability(ClientCapabilities.Client);
              const space = getActiveSpace(context) ?? client.spaces.default;
              const chat = await getOrCreateChat(dispatch, space.db);
              if (!chat) {
                return;
              }

              await dispatch(
                createIntent(Common.LayoutAction.UpdateDialog, {
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
        ],
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}/companion-chat`,
        match: NodeMatcher.whenObject,
        connector: (object, get) => {
          const currentChatState = get(
            CreateAtom.fromSignal(
              () => context.getCapability(AssistantCapabilities.State).currentChat[Obj.getDXN(object).toString()],
            ),
          );
          // If no state, continue to allow chat initialization.
          if (!currentChatState) {
            return [
              {
                id: [Obj.getDXN(object).toString(), 'assistant-chat'].join(ATTENDABLE_PATH_SEPARATOR),
                type: PLANK_COMPANION_TYPE,
                data: 'assistant-chat',
                properties: {
                  label: ['assistant chat label', { ns: meta.id }],
                  icon: 'ph--sparkle--regular',
                  position: 'hoist',
                  disposition: 'hidden',
                },
              },
            ];
          }

          const db = Obj.getDatabase(object);
          const currentChatDxn = DXN.tryParse(currentChatState);
          const currentChatRef = currentChatDxn ? db?.makeRef(currentChatDxn) : undefined;
          const currentChat = get(CreateAtom.fromSignal(() => currentChatRef?.target));
          if (!Obj.isObject(currentChat)) {
            return [];
          }

          return [
            {
              id: [Obj.getDXN(object).toString(), 'assistant-chat'].join(ATTENDABLE_PATH_SEPARATOR),
              type: PLANK_COMPANION_TYPE,
              data: currentChat,
              properties: {
                label: ['assistant chat label', { ns: meta.id }],
                icon: 'ph--sparkle--regular',
                position: 'hoist',
                disposition: 'hidden',
              },
            },
          ];
        },
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}/invocations`,
        match: (node) =>
          Function.pipe(
            NodeMatcher.whenType(Sequence)(node),
            Option.map(() => node),
            Option.orElse(() =>
              Function.pipe(
                NodeMatcher.whenType(Prompt.Prompt)(node),
                Option.map(() => node),
              ),
            ),
          ),
        connector: (node, get) => [
          {
            id: [node.id, 'invocations'].join(ATTENDABLE_PATH_SEPARATOR),
            type: PLANK_COMPANION_TYPE,
            data: 'invocations',
            properties: {
              label: ['invocations label', { ns: meta.id }],
              icon: 'ph--clock-countdown--regular',
              disposition: 'hidden',
            },
          },
        ],
      }),
    ]);
  }),
);

// TODO(burdon): Factor out.
const getOrCreateChat = async (
  dispatch: PromiseIntentDispatcher,
  db: Database.Database,
): Promise<Assistant.Chat | undefined> => {
  // TODO(wittjosiah): This should be possible with a single query.
  const allChats = await db.query(Query.type(Assistant.Chat)).run();
  const relatedChats = await db.query(Query.type(Assistant.Chat).sourceOf(Assistant.CompanionTo).source()).run();

  const chats = allChats.filter((chat) => !relatedChats.includes(chat));
  if (chats.length > 0) {
    return chats.at(-1);
  }

  const { data } = await dispatch(createIntent(AssistantAction.CreateChat, { db }));
  invariant(Obj.instanceOf(Assistant.Chat, data?.object));
  await dispatch(createIntent(SpaceAction.AddObject, { target: db, object: data.object }));
  return data.object;
};
