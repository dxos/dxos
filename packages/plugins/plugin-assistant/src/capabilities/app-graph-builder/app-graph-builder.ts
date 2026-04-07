//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { pipe } from 'effect/Function';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, getPersonalSpace, LayoutOperation } from '@dxos/app-toolkit';
import { linkedSegment } from '@dxos/react-ui-attention';
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

import { ASSISTANT_COMPANION_VARIANT, ASSISTANT_DIALOG, meta } from '../../meta';
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
                label: ['chat-update-name.label', { ns: meta.id }],
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
                const space = getActiveSpace(capabilities) ?? getPersonalSpace(client);
                if (!space) {
                  return;
                }
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
                label: ['open-assistant.label', { ns: meta.id }],
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
                const space = getActiveSpace(capabilities) ?? getPersonalSpace(client);
                if (!space) {
                  return;
                }
                const blueprints = yield* Effect.tryPromise(() =>
                  space.db.query(Query.type(Blueprint.Blueprint)).run(),
                );
                for (const blueprint of blueprints) {
                  space.db.remove(blueprint);
                }
                yield* Database.flush();
              }),
              properties: {
                label: ['reset-blueprints.label', { ns: meta.id }],
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
            const cache = get(yield* Capability.get(AssistantCapabilities.CompanionChatCache));
            const objectDxn = Obj.getDXN(object).toString();

            // Resolve chat from persisted state or transient cache.
            const chat = pipe(
              Option.fromNullable(state.currentChat[objectDxn]),
              Option.flatMap((dxnStr) => Option.fromNullable(DXN.tryParse(dxnStr))),
              Option.flatMap((dxn) => Option.fromNullable(Obj.getDatabase(object)?.makeRef(dxn))),
              Option.map((ref) => get(AtomObj.make(ref as Ref.Ref<Obj.Unknown>))),
              Option.filter(Obj.isObject),
              Option.orElse(() => pipe(Option.fromNullable(cache[objectDxn]), Option.filter(Obj.isObject))),
              Option.getOrNull,
            );

            return [
              {
                id: linkedSegment(ASSISTANT_COMPANION_VARIANT),
                type: PLANK_COMPANION_TYPE,
                data: chat,
                properties: {
                  label: ['assistant-chat.label', { ns: meta.id }],
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
                label: ['invocations.label', { ns: meta.id }],
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
              id: linkedSegment('trace'),
              type: DECK_COMPANION_TYPE,
              data: 'trace' as const,
              properties: {
                label: ['trace.label', { ns: meta.id }],
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
