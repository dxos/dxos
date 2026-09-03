//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import { AssistantTestLayerWithTriggers } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AiContext } from '@dxos/assistant';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Message, Outline, Task } from '@dxos/types';

import { PlanReminder } from './definitions';
import { PlanningHandlers } from './index';

EntityId.dangerouslyDisableRandomness();

describe('PlanReminder', () => {
  it.effect(
    'attempts a continuation reminder when the model says continue',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* setupChatWithChecklist([false]);
        const exit = yield* Effect.exit(Operation.invoke(PlanReminder, {}).pipe(Effect.provide(conversation)));

        expect(Exit.isFailure(exit)).toBe(true);
      },
      Effect.provide(layerDeciding('continue')),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'enqueues nothing when the model says stop',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* setupChatWithChecklist([false]);
        const exit = yield* Effect.exit(Operation.invoke(PlanReminder, {}).pipe(Effect.provide(conversation)));

        expect(Exit.isSuccess(exit)).toBe(true);
      },
      Effect.provide(layerDeciding('stop')),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'is a no-op when every item is checked, without consulting the model',
    Effect.fnUntraced(
      function* (_) {
        const conversation = yield* setupChatWithChecklist([true]);
        const exit = yield* Effect.exit(Operation.invoke(PlanReminder, {}).pipe(Effect.provide(conversation)));

        // The script is empty, so reaching the model at all would fail as exhausted.
        expect(Exit.isSuccess(exit)).toBe(true);
      },
      Effect.provide(
        AssistantTestLayerWithTriggers({
          operationHandlers: OperationHandlerSet.merge(PlanningHandlers),
          types,
          aiService: ScriptedLanguageModel.scriptedAiService([]),
        }),
      ),
      TestHelpers.provideTestContext,
    ),
  );
});

/** Creates a chat bound to its feed, carrying a checklist with the given item states. */
const setupChatWithChecklist = Effect.fnUntraced(function* (states: readonly boolean[]) {
  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
  const { db } = yield* Database.Service;
  states.forEach((done, index) => {
    Chat.addTask(db, chat, `Task ${index}`, { status: done ? 'done' : 'todo' });
  });
  yield* Database.flush();

  const runtime = yield* Effect.context<Database.Service>();
  const binder = new AiContext.Binder({ feed, runtime });
  yield* Effect.promise(() => binder.bind({ objects: [Ref.make(chat)] }));

  return Operation.withInvocationOptions({ conversation: Obj.getURI(feed) });
});

const types = [
  Agent.Agent,
  Outline.Outline,
  Task.Task,
  Text.Text,
  Chat.Chat,
  Skill.Skill,
  Feed.Feed,
  Message.Message,
  AiContext.Binding,
];

// The hook asks the model whether to keep working; scripting that reply covers both branches, which
// a single frozen conversation could not.
//
// No host process is spawned, so the Tier B enqueue on the continue branch fails with
// NotSupportedError. That failure is the assertion: it fires exactly when the hook decided to
// enqueue, and its absence proves it decided not to — observable without reaching into the host's
// queue, which is where the reminder would otherwise land.
const layerDeciding = (decision: string) =>
  AssistantTestLayerWithTriggers({
    operationHandlers: OperationHandlerSet.merge(PlanningHandlers),
    types,
    aiService: ScriptedLanguageModel.scriptedAiService([{ parts: [ScriptedLanguageModel.text(decision)] }]),
  });
