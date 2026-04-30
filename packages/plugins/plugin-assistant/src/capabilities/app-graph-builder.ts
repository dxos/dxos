//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, getActiveSpace, getPersonalSpace } from '@dxos/app-toolkit';
import { Chat } from '@dxos/assistant-toolkit';
import { Blueprint, Prompt } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { DXN, Database, Filter, Obj, type Ref } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/compute';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { linkedSegment } from '@dxos/react-ui-attention';

import { ASSISTANT_COMPANION_VARIANT, meta } from '#meta';
import { AssistantOperation } from '#operations';
import { AssistantCapabilities } from '#types';

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
                  const computeRuntime = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
                  const db = Obj.getDatabase(chat);
                  invariant(db);
                  const runtime = yield* computeRuntime.getRuntime(db.spaceId).runtimeEffect;
                  yield* Operation.invoke(AssistantOperation.UpdateChatName, { chat }).pipe(Effect.provide(runtime));
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
              id: 'reset-blueprints',
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
        id: 'companion-chat',
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
              AppNode.makeCompanion({
                id: linkedSegment(ASSISTANT_COMPANION_VARIANT),
                label: ['assistant-chat.label', { ns: meta.id }],
                icon: 'ph--sparkle--regular',
                data: chat,
                position: 'hoist',
              }),
            ];
          }),
      }),

      GraphBuilder.createExtension({
        id: 'invocations',
        match: NodeMatcher.whenAny(
          NodeMatcher.whenEchoTypeMatches(Sequence),
          NodeMatcher.whenEchoTypeMatches(Prompt.Prompt),
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
              position: 'fallback',
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
