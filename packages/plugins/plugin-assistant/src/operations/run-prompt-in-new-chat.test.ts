//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { TrajectoryStore } from '@dxos/assistant';
import * as AgentOperation from '@dxos/assistant-toolkit/AgentOperation';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';
import * as RoutineOperation from '@dxos/plugin-routine/RoutineOperation';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Text } from '@dxos/schema';

import { AssistantOperationHandlerSet } from '#operations';

EntityId.dangerouslyDisableRandomness();

/** Chats the stubbed agent was asked to run in. */
const ranInChats: Ref.Ref<Chat.Chat>[] = [];

// Stand-ins for handlers other plugins contribute: filing the chat, and the agent run itself.
const StubHandlers = OperationHandlerSet.make(
  SpaceOperation.AddObject.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ object }) {
        invariant(Obj.isObject(object), 'Expected a live object.');
        const added = yield* Database.add(object);
        return { id: added.id, object: added };
      }),
    ),
  ),
  AgentOperation.RunInstructions.pipe(
    Operation.withHandler(({ chat }) =>
      Effect.sync(() => {
        if (chat) {
          ranInChats.push(chat);
        }
        return {};
      }),
    ),
  ),
);

// Mirrors an EDGE host, which contributes no atom registry and no client.
const headlessManager = CapabilityManager.make({ registry: AtomRegistry.make() });

const TestLayer = AssistantTestLayer({
  operationHandlers: [AssistantOperationHandlerSet, StubHandlers],
  types: [Chat.Chat, Feed.Feed, Text.Text, ...TrajectoryStore.types],
  extraServices: Layer.succeed(Capability.Service, headlessManager),
});

describe('RunPromptInNewChat', () => {
  it.effect(
    'binds context and runs in the background with no atom registry or client',
    Effect.fnUntraced(
      function* (_) {
        const { db } = yield* Database.Service;
        const context = db.add(Obj.make(Text.Text, { content: 'context' }));

        const { object: chat } = yield* Operation.invoke(RoutineOperation.RunPromptInNewChat, {
          db,
          instructions: 'Summarize the context.',
          objects: [context],
          background: true,
        });

        expect(ranInChats.map((ref) => ref.uri)).toEqual([Ref.make(chat).uri]);
        const feed = yield* Database.load(chat.feed);
        const bound = (yield* TrajectoryStore.read(feed)).flatMap((event) =>
          event.payload._tag === 'contextBind' ? event.payload.objects.map((ref) => ref.uri) : [],
        );
        expect(bound).toContain(Ref.make(context).uri);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
