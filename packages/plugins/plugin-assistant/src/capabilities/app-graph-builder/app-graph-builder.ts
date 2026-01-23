//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Prompt } from '@dxos/blueprints';
import { Sequence } from '@dxos/conductor';
import { DXN, type Database, Obj } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';
import { invariant } from '@dxos/invariant';
import { Operation, type OperationInvoker } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { getActiveSpace } from '@dxos/plugin-space';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { Query } from '@dxos/react-client/echo';

import { ASSISTANT_DIALOG, meta } from '../../meta';
import { Assistant, AssistantCapabilities, AssistantOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const extensions = yield* Effect.all([
      GraphBuilder.createTypeExtension({
        id: `${meta.id}/root`,
        type: Assistant.Chat,
        actions: (chat) => {
          const id = Obj.getDXN(chat).toString();
          return Effect.succeed([
            {
              id: `${AssistantOperation.UpdateChatName.meta.key}/${id}`,
              data: () => Operation.invoke(AssistantOperation.UpdateChatName, { chat }),
              properties: {
                label: ['chat update name label', { ns: meta.id }],
                icon: 'ph--magic-wand--regular',
                disposition: 'list-item',
              },
            },
          ]);
        },
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}/assistant`,
        match: NodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            {
              id: `${Common.LayoutOperation.UpdateDialog.meta.key}/assistant/open`,
              data: Effect.fnUntraced(function* () {
                const capabilities = yield* Capability.Service;
                const client = yield* Capability.get(ClientCapabilities.Client);
                const operationInvoker = yield* Capability.get(Common.Capability.OperationInvoker);
                const space = getActiveSpace(capabilities) ?? client.spaces.default;
                const chat = yield* Effect.tryPromise(() => getOrCreateChat(operationInvoker.invokePromise, space.db));
                if (!chat) {
                  return;
                }

                yield* Operation.invoke(Common.LayoutOperation.UpdateDialog, {
                  subject: ASSISTANT_DIALOG,
                  state: true,
                  blockAlign: 'end',
                  props: {
                    chat,
                  },
                });
              }),
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
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}/companion-chat`,
        match: NodeMatcher.whenEchoObject,
        connector: (object, get) => {
          const stateAtom = capabilities.get(AssistantCapabilities.State);
          const state = get(stateAtom);
          const currentChatState = state.currentChat[Obj.getDXN(object).toString()];
          // If no state, continue to allow chat initialization.
          if (!currentChatState) {
            return Effect.succeed([
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
            ]);
          }

          const db = Obj.getDatabase(object);
          const currentChatDxn = DXN.tryParse(currentChatState);
          const currentChatRef = currentChatDxn ? db?.makeRef(currentChatDxn) : undefined;
          const currentChat = currentChatRef ? get(AtomObj.make(currentChatRef)) : undefined;
          if (!Obj.isObject(currentChat)) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
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
          ]);
        },
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}/invocations`,
        match: NodeMatcher.whenAny(
          NodeMatcher.whenEchoTypeMatches(Sequence),
          NodeMatcher.whenEchoTypeMatches(Prompt.Prompt),
        ),
        connector: (node, get) =>
          Effect.succeed([
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
          ]),
      }),
    ]);

    return Capability.contributes(Common.Capability.AppGraphBuilder, extensions);
  }),
);

// TODO(burdon): Factor out.
const getOrCreateChat = async (
  invokePromise: OperationInvoker.OperationInvoker['invokePromise'],
  db: Database.Database,
): Promise<Assistant.Chat | undefined> => {
  // TODO(wittjosiah): This should be possible with a single query.
  const allChats = await db.query(Query.type(Assistant.Chat)).run();
  const relatedChats = await db.query(Query.type(Assistant.Chat).sourceOf(Assistant.CompanionTo).source()).run();

  const chats = allChats.filter((chat) => !relatedChats.includes(chat));
  if (chats.length > 0) {
    return chats.at(-1);
  }

  const { data } = await invokePromise(AssistantOperation.CreateChat, { db });
  invariant(Obj.instanceOf(Assistant.Chat, data?.object));
  await invokePromise(SpaceOperation.AddObject, { target: db, object: data.object });
  return data.object;
};
