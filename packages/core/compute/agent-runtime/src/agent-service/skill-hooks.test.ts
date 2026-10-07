//
// Copyright 2026 DXOS.org
//

import { beforeEach, describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { ProcessManager } from '@dxos/compute-runtime';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as Skill from '@dxos/compute/Skill';
import { Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';
import { Message } from '@dxos/types';

import { AssistantTestLayer } from '../testing/index.ts';
import { AGENT_PROCESS_KEY } from './agent-process.ts';
import * as AgentService from './AgentService.ts';

EntityId.dangerouslyDisableRandomness();

const InlineHook = Operation.make({
  meta: { key: DXN.make('com.example.operation.inlineHook'), name: 'Inline hook' },
  input: Schema.Struct({}),
  output: Schema.Void,
});

const BackgroundHook = Operation.make({
  meta: { key: DXN.make('com.example.operation.backgroundHook'), name: 'Background hook' },
  input: Schema.Struct({}),
  output: Schema.Void,
});

const FailingHook = Operation.make({
  meta: { key: DXN.make('com.example.operation.failingHook'), name: 'Failing hook' },
  input: Schema.Struct({}),
  output: Schema.Void,
});

/** Hook invocations in the order they started and finished, and the gate the background hook holds on. */
type HookLog = { events: string[]; release: () => void; released: Promise<void> };

const makeHookLog = (): HookLog => {
  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { events: [], release, released };
};

let hookLog = makeHookLog();

const handlers = OperationHandlerSet.make(
  InlineHook.pipe(Operation.withHandler(() => Effect.sync(() => void hookLog.events.push('inline')))),
  BackgroundHook.pipe(
    Operation.withHandler(() =>
      Effect.gen(function* () {
        hookLog.events.push('background:start');
        yield* Effect.promise(() => hookLog.released);
        hookLog.events.push('background:end');
      }),
    ),
  ),
  FailingHook.pipe(Operation.withHandler(() => Effect.die(new Error('hook failed')))),
);

const hook = (operation: Operation.Definition.Any, async: boolean): Skill.Hook => ({
  spec: { _tag: 'end-request' },
  async,
  function: Ref.make(Operation.serialize(operation)),
});

const HookSkill = Skill.make({
  key: 'com.example.skill.hooks',
  name: 'Hooks',
  hooks: [hook(InlineHook, false), hook(BackgroundHook, true)],
});

const FailingHookSkill = Skill.make({
  key: 'com.example.skill.failingHooks',
  name: 'Failing hooks',
  hooks: [hook(FailingHook, true)],
});

const TestLayer = AssistantTestLayer({
  operationHandlers: handlers,
  types: [Skill.Skill, Feed.Feed, Message.Message],
  skills: [HookSkill, FailingHookSkill],
  aiService: ScriptedLanguageModel.scriptedAiService(() => ({ parts: [ScriptedLanguageModel.text('Done.')] })),
});

/** The agent process serving the session's chat. */
const agentProcess = (session: { chat: Obj.Unknown }) =>
  Effect.gen(function* () {
    const processManager = yield* ProcessManager.ProcessManagerService;
    const [handle] = yield* processManager.list({ target: Obj.getURI(session.chat), key: AGENT_PROCESS_KEY });
    return handle;
  });

describe('end-request skill hooks', () => {
  beforeEach(() => {
    hookLog = makeHookLog();
  });

  it.effect(
    'a background hook does not hold up the request, and the process awaits it before finishing',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession({ skills: [HookSkill] });
        yield* session.submitPrompt('Hello.');
        yield* session.waitForCompletion();

        // The request settled while the background hook is still blocked; the inline hook ran first.
        expect(hookLog.events).toEqual(['inline', 'background:start']);
        const handle = yield* agentProcess(session);
        expect(handle.status.state).not.toBe(Process.State.SUCCEEDED);

        hookLog.release();
        yield* Effect.promise(async () => {
          await expect.poll(() => handle.status.state, { timeout: 5_000 }).toBe(Process.State.SUCCEEDED);
        });
        expect(hookLog.events).toEqual(['inline', 'background:start', 'background:end']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a failing background hook still lets the process finish',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession({ skills: [FailingHookSkill] });
        yield* session.submitPrompt('Hello.');
        yield* session.waitForCompletion();

        const handle = yield* agentProcess(session);
        yield* Effect.promise(async () => {
          await expect.poll(() => handle.status.state, { timeout: 5_000 }).toBe(Process.State.SUCCEEDED);
        });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
