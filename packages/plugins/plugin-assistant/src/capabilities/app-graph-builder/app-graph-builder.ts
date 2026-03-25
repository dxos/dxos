//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, companionSegment, LayoutOperation } from '@dxos/app-toolkit';
import { Chat } from '@dxos/assistant-toolkit';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { Sequence } from '@dxos/conductor';
import { DXN, Database, Obj, type Ref } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';
import { invariant } from '@dxos/invariant';
import { Operation, type OperationInvoker } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { DECK_COMPANION_TYPE, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { getActiveSpace } from '@dxos/plugin-space';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { Query } from '@dxos/react-client/echo';

import { ASSISTANT_DIALOG, meta } from '../../meta';
import { AssistantCapabilities } from '../../types';
import { AssistantOperation } from '../../operations';

/** Match ECHO objects that are NOT chats. */
const whenNonChatObject = NodeMatcher.whenAll(
  NodeMatcher.whenEchoObject,
  NodeMatcher.whenNot(NodeMatcher.whenEchoTypeMatches(Chat.Chat)),
);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const extensions = yield* Effect.all([
      GraphBuilder.createTypeExtension({
        id: `${meta.id}.root`,
        type: Chat.Chat,
        actions: (chat) => {
          return Effect.succeed([
            {
              id: AssistantOperation.UpdateChatName.meta.key,
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
        id: `${meta.id}.assistant`,
        match: NodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            {
              id: `${LayoutOperation.UpdateDialog.meta.key}.assistant.open`,
              data: Effect.fnUntraced(function* () {
                const capabilities = yield* Capability.Service;
                const client = yield* Capability.get(ClientCapabilities.Client);
                const operationInvoker = yield* Capability.get(Capabilities.OperationInvoker);
                const space = getActiveSpace(capabilities) ?? client.spaces.default;
                const chat = yield* Effect.tryPromise(() => getOrCreateChat(operationInvoker.invokePromise, space.db));
                if (!chat) {
                  return;
                }

                yield* Operation.invoke(LayoutOperation.UpdateDialog, {
                  subject: ASSISTANT_DIALOG,
                  state: true,
                  blockAlign: 'end',
                  props: { chat },
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
            {
              id: `${meta.id}.reset-blueprints`,
              data: Effect.fnUntraced(function* () {
                const capabilities = yield* Capability.Service;
                const client = yield* Capability.get(ClientCapabilities.Client);
                const space = getActiveSpace(capabilities) ?? client.spaces.default;
                const blueprints = yield* Effect.tryPromise(() =>
                  space.db.query(Query.type(Blueprint.Blueprint)).run(),
                );
                for (const blueprint of blueprints) {
                  space.db.remove(blueprint);
                }
                yield* Database.flush();
              }),
              properties: {
                label: ['reset blueprints label', { ns: meta.id }],
                icon: 'ph--arrow-clockwise--regular',
              },
            },
          ]),
      }),

      // Don't show assistant companion when a chat is already the primary object.
      GraphBuilder.createExtension({
        id: `${meta.id}.companion-chat`,
        match: whenNonChatObject,
        connector: (object, get) =>
          Effect.gen(function* () {
            const state = get(yield* Capability.get(AssistantCapabilities.State));
            const currentChatState = state.currentChat[Obj.getDXN(object).toString()];
            // If no state, continue to allow chat initialization.
            if (!currentChatState) {
              return [
                {
                  id: 'assistant-chat',
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
            const currentChat = currentChatRef ? get(AtomObj.make(currentChatRef as Ref.Ref<Obj.Unknown>)) : undefined;

            // Return the resolved chat object, or fall back to 'assistant-chat' string if it can't be resolved.
            // This ensures the companion remains visible even during transient states.
            return [
              {
                id: 'assistant-chat',
                type: PLANK_COMPANION_TYPE,
                data: Obj.isObject(currentChat) ? currentChat : 'assistant-chat',
                properties: {
                  label: ['assistant chat label', { ns: meta.id }],
                  icon: 'ph--sparkle--regular',
                  position: 'hoist',
                  disposition: 'hidden',
                },
              },
            ];
          }),
      }),

      GraphBuilder.createExtension({
        id: `${meta.id}.invocations`,
        match: NodeMatcher.whenAny(
          NodeMatcher.whenEchoTypeMatches(Sequence),
          NodeMatcher.whenEchoTypeMatches(Prompt.Prompt),
        ),
        connector: () =>
          Effect.succeed([
            {
              id: 'invocations',
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

      GraphBuilder.createExtension({
        id: `${meta.id}.trace`,
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            {
              id: companionSegment('trace'),
              type: DECK_COMPANION_TYPE,
              data: 'trace' as const,
              properties: {
                label: ['trace label', { ns: meta.id }],
                icon: 'ph--line-segments--regular',
                disposition: 'hidden',
                position: 'fallback',
              },
            },
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);

// TODO(burdon): Factor out.
const getOrCreateChat = async (
  invokePromise: OperationInvoker.OperationInvoker['invokePromise'],
  db: Database.Database,
): Promise<Chat.Chat | undefined> => {
  // TODO(wittjosiah): This should be possible with a single query.
  const allChats = await db.query(Query.type(Chat.Chat)).run();
  const relatedChats = await db.query(Query.type(Chat.Chat).sourceOf(Chat.CompanionTo).source()).run();

  const chats = allChats.filter((chat) => !relatedChats.includes(chat));
  if (chats.length > 0) {
    return chats.at(-1);
  }

  const { data } = await invokePromise(AssistantOperation.CreateChat, { db });
  invariant(Obj.instanceOf(Chat.Chat, data?.object));
  await invokePromise(SpaceOperation.AddObject, { target: db, object: data.object });
  return data.object;
};
