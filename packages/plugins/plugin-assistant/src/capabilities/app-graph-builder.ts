//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import {
  AppCapabilities,
  AppNode,
  LayoutOperation,
  createTypeSectionExtension,
  createTypeSectionPathResolver,
  getActiveSpace,
  getPersonalSpace,
} from '@dxos/app-toolkit';
import { AgentPrompt, Chat } from '@dxos/assistant-toolkit';
import { isSpace } from '@dxos/client/echo';
import { Blueprint, Operation, Routine } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { DXN, Database, Filter, Obj, Type, type Ref } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { linkedSegment } from '@dxos/react-ui-attention';

import { ASSISTANT_COMPANION_VARIANT, meta } from '#meta';
import { AssistantCapabilities, AssistantOperation } from '#types';

import { getChatsPath } from '../paths';

/** Operation definitions to seed as `PersistentOperation` records for automation / triggers. */
const computeOperationsToImport = [AgentPrompt] as const;

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
        id: 'root',
        type: Chat.Chat,
        actions: (chat) => {
          return Effect.succeed([
            Node.makeAction({
              id: AssistantOperation.UpdateChatName.meta.key,
              data: () =>
                Effect.gen(function* () {
                  // TODO(dmaretskyi): This goes away when composer will have unified operation invocations.
                  const db = Obj.getDatabase(chat);
                  invariant(db);
                  yield* Operation.invoke(AssistantOperation.UpdateChatName, { chat }, { spaceId: db.spaceId });
                }),
              properties: {
                label: ['chat-update-name.label', { ns: meta.id }],
                icon: 'ph--magic-wand--regular',
                disposition: 'list-item',
              },
            }),
          ]);
        },
      }),

      GraphBuilder.createExtension({
        id: 'assistant',
        match: NodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            Node.makeAction({
              id: 'importComputeOperations',
              data: Effect.fnUntraced(function* () {
                const capabilities = yield* Capability.Service;
                const client = yield* Capability.get(ClientCapabilities.Client);
                const space = getActiveSpace(client, capabilities) ?? getPersonalSpace(client);
                if (!space) {
                  return;
                }
                for (const definition of computeOperationsToImport) {
                  const key = definition.meta.key;
                  if (!key) {
                    continue;
                  }
                  const existing = yield* Effect.promise(
                    (): Promise<Operation.PersistentOperation[]> =>
                      space.db.query(Filter.and(Filter.type(Operation.PersistentOperation), Filter.key(key))).run(),
                  );
                  if (existing.length === 0) {
                    space.db.add(Operation.serialize(definition));
                  }
                }
                yield* Database.flush();
              }),
              properties: {
                label: ['import-compute-operations.label', { ns: meta.id }],
                icon: 'ph--download-simple--regular',
              },
            }),
            Node.makeAction({
              id: AssistantOperation.ToggleTracePanelDebug.meta.key,
              data: () => Operation.invoke(AssistantOperation.ToggleTracePanelDebug, {}),
              properties: {
                label: ['toggle-trace-panel-debug.label', { ns: meta.id }],
                icon: 'ph--brackets-curly--regular',
              },
            }),
            Node.makeAction({
              id: 'resetBlueprints',
              data: Effect.fnUntraced(function* () {
                const capabilities = yield* Capability.Service;
                const client = yield* Capability.get(ClientCapabilities.Client);
                const space = getActiveSpace(client, capabilities) ?? getPersonalSpace(client);
                if (!space) {
                  return;
                }
                const blueprints = yield* Effect.promise(
                  (): Promise<Blueprint.Blueprint[]> => space.db.query(Filter.type(Blueprint.Blueprint)).run(),
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
            }),
          ]),
      }),

      // Don't show assistant companion when a chat is already the primary object.
      GraphBuilder.createExtension({
        id: 'companionChat',
        match: whenNonChatObject,
        connector: (object, get) =>
          Effect.gen(function* () {
            const state = get(yield* Capability.get(AssistantCapabilities.State));
            const cache = get(yield* Capability.get(AssistantCapabilities.CompanionChatCache));
            const objectUri = Obj.getURI(object);

            // Resolve chat from persisted state or transient cache.
            const chat = pipe(
              Option.fromNullable(state.currentChat[objectUri]),
              Option.flatMap((dxnStr) => Option.fromNullable(DXN.tryMake(dxnStr))),
              Option.flatMap((dxn) => Option.fromNullable(Obj.getDatabase(object)?.makeRef(dxn))),
              Option.map((ref) => get(AtomObj.make(ref as Ref.Ref<Obj.Unknown>))),
              Option.filter(Obj.isObject),
              Option.orElse(() => pipe(Option.fromNullable(cache[objectUri]), Option.filter(Obj.isObject))),
              Option.getOrNull,
            );

            return [
              AppNode.makeCompanion({
                id: linkedSegment(ASSISTANT_COMPANION_VARIANT),
                label: ['assistant-chat.label', { ns: meta.id }],
                icon: 'ph--sparkle--regular',
                data: chat,
                position: 'first',
              }),
            ];
          }),
      }),

      GraphBuilder.createExtension({
        id: 'invocations',
        match: NodeMatcher.whenAny(
          NodeMatcher.whenEchoTypeMatches(Sequence.Sequence),
          NodeMatcher.whenEchoTypeMatches(Routine.Routine),
        ),
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: 'invocations',
              label: ['invocations.label', { ns: meta.id }],
              icon: 'ph--clock-countdown--regular',
              data: 'invocations',
            }),
          ]),
      }),

      GraphBuilder.createExtension({
        id: 'trace',
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: linkedSegment('trace'),
              label: ['trace.label', { ns: meta.id }],
              icon: 'ph--line-segments--regular',
              data: 'trace' as const,
              position: 'last',
            }),
          ]),
      }),

      // Section node: one Chat.Chat per space, hidden when empty.
      createTypeSectionExtension(Chat.Chat),

      // Create-chat action on the Chats section header.
      GraphBuilder.createExtension({
        id: 'chatsSectionActions',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === Type.getTypename(Chat.Chat) && space ? Option.some(space) : Option.none();
        },
        actions: (space) =>
          Effect.succeed([
            Node.makeAction({
              id: 'create-chat',
              data: () =>
                Effect.gen(function* () {
                  const { object: chat } = yield* Operation.invoke(
                    AssistantOperation.CreateChat,
                    { db: space.db },
                    { spaceId: space.db.spaceId },
                  );
                  const { subject } = yield* Operation.invoke(
                    SpaceOperation.AddObject,
                    { object: chat, target: space.db, hidden: true, targetNodeId: getChatsPath(space.db.spaceId) },
                    { spaceId: space.db.spaceId },
                  );
                  yield* Operation.invoke(
                    LayoutOperation.Open,
                    { subject: [...subject] },
                    { spaceId: space.db.spaceId },
                  );
                }),
              properties: {
                label: ['create-chat.label', { ns: meta.id }],
                icon: 'ph--plus--regular',
                disposition: 'list-item-primary',
              },
            }),
          ]),
      }),
    ]);

    return [
      Capability.contributes(AppCapabilities.AppGraphBuilder, extensions),
      Capability.contributes(AppCapabilities.NavigationPathResolver, createTypeSectionPathResolver(Chat.Chat)),
    ];
  }),
);
