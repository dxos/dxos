//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { expect } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Chat from '@dxos/assistant/Chat';
import { ProcessManager } from '@dxos/compute-runtime';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Text } from '@dxos/schema';

import { Relay } from './definitions.ts';
import relayHandler from './relay.ts';

const TestLayer = AssistantTestLayer({
  operationHandlers: OperationHandlerSet.make(relayHandler),
  types: [Chat.Chat, Instructions.Instructions, Text.Text, Feed.Feed],
});

// Control-plane only: the qualify:false path needs no LLM turn, so it runs ungated in CI.
// Qualification itself (cheap-model relevance) is covered by the memoized agent-skill suite.
describe('Agent relay (control plane)', () => {
  it.effect(
    'forwards onto the durable session for the chat',
    Effect.fnUntraced(
      function* (_) {
        const processManager = yield* ProcessManager.ProcessManagerService;

        const instructions = yield* Database.add(Instructions.make({ text: 'Relay target.' }));
        const feed = yield* Database.add(Feed.make());
        const chat = yield* Database.add(
          Chat.make({ name: 'Relay chat', feed: Ref.make(feed), instructions: Ref.make(instructions) }),
        );
        yield* Database.flush();

        yield* Operation.invoke(Relay, {
          chat: Ref.make(chat),
          prompt: 'Wake up.',
          qualify: false,
        });

        // Delivery lands on the durable process bound to the chat (spawned on demand).
        const target = Obj.getURI(chat);
        const processes = yield* processManager.list({ target });
        expect(processes.length).toBeGreaterThanOrEqual(1);

        // Terminate before the turn runs — this test proves delivery, not the LLM turn.
        for (const handle of processes) {
          if (handle.status.state === Process.State.RUNNING) {
            yield* handle.terminate();
          }
        }
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
