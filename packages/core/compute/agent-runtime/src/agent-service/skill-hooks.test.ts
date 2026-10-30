//
// Copyright 2026 DXOS.org
//

import { beforeEach, describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import { ProcessManager } from '@dxos/compute-runtime';
import * as Hook from '@dxos/compute/Hook';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as Skill from '@dxos/compute/Skill';
import { Annotation, Database, Feed, Filter, Obj } from '@dxos/echo';
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

const QuickHook = Operation.make({
  meta: { key: DXN.make('com.example.operation.quickHook'), name: 'Quick hook' },
  input: Schema.Struct({}),
  output: Schema.Void,
});

const FailingHook = Operation.make({
  meta: { key: DXN.make('com.example.operation.failingHook'), name: 'Failing hook' },
  input: Schema.Struct({}),
  output: Schema.Void,
});

const FollowUpHook = Operation.make({
  meta: { key: DXN.make('com.example.operation.followUpHook'), name: 'Follow-up hook' },
  input: Schema.Struct({}),
  output: Hook.Output,
});

const FOLLOW_UP = 'Check your work once more.';

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
  QuickHook.pipe(Operation.withHandler(() => Effect.sync(() => void hookLog.events.push('quick')))),
  // Asks for one more turn, then lets the request end.
  FollowUpHook.pipe(
    Operation.withHandler(() =>
      Effect.sync(() => {
        hookLog.events.push('follow-up');
        return hookLog.events.filter((event) => event === 'follow-up').length === 1 ? { followUp: FOLLOW_UP } : {};
      }),
    ),
  ),
);

const HookSkill = Skill.make({ key: 'com.example.skill.hooks', name: 'Hooks' });
const FailingHookSkill = Skill.make({ key: 'com.example.skill.failingHooks', name: 'Failing hooks' });
// Its hook finishes at once, so its exit can race the agent registering it.
const QuickHookSkill = Skill.make({ key: 'com.example.skill.quickHooks', name: 'Quick hooks' });
const FollowUpSkill = Skill.make({ key: 'com.example.skill.followUp', name: 'Follow-up' });

const hook = (skill: Skill.Skill, operation: Operation.Definition.Any, async = false): Hook.Definition => ({
  key: `${String(operation.meta.key)}.hook`,
  event: 'end-request',
  skill: Skill.getKey(skill),
  operation,
  async,
});

const HOOKS = [
  hook(HookSkill, InlineHook),
  hook(HookSkill, BackgroundHook, true),
  hook(FailingHookSkill, FailingHook, true),
  hook(QuickHookSkill, QuickHook, true),
  hook(FollowUpSkill, FollowUpHook),
];

const TestLayer = AssistantTestLayer({
  operationHandlers: handlers,
  types: [Skill.Skill, Feed.Feed, Message.Message, Instructions.Instructions, SpaceProperties],
  skills: [HookSkill, FailingHookSkill, QuickHookSkill, FollowUpSkill],
  aiService: ScriptedLanguageModel.scriptedAiService(() => ({ parts: [ScriptedLanguageModel.text('Done.')] })),
  agent: { hooks: () => HOOKS },
});

/** Instructions whose hook settings are `settings`. */
const withHooks = Effect.fnUntraced(function* (settings: Hook.Settings) {
  const instructions = yield* Database.add(Instructions.make({}));
  Obj.update(instructions, (instructions) => Annotation.set(instructions, Hook.SettingsAnnotation, settings));
  return instructions;
});

/** Instructions with every hook in the catalog turned on. */
const allHooks = Effect.fnUntraced(function* () {
  const instructions = yield* Database.add(Instructions.make({}));
  Hook.enable(instructions, HOOKS);
  return instructions;
});

/** The agent process serving the session's chat. */
const agentProcess = Effect.fnUntraced(function* (session: { chat: Obj.Unknown }) {
  const processManager = yield* ProcessManager.ProcessManagerService;
  const [handle] = yield* processManager.list({ target: Obj.getURI(session.chat), key: AGENT_PROCESS_KEY });
  return handle;
});

describe('end-request hooks', () => {
  beforeEach(() => {
    hookLog = makeHookLog();
  });

  it.effect(
    'a background hook does not hold up the request, and the process awaits it before finishing',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession({ skills: [HookSkill], instructions: yield* allHooks() });
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
    "a hook's follow-up is queued as the next prompt and continues the request",
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession({ skills: [FollowUpSkill], instructions: yield* allHooks() });
        yield* session.submitPrompt('Hello.');
        yield* session.waitForCompletion();

        // The follow-up ran a second turn, whose end fired the hook again; that one asked for nothing.
        expect(hookLog.events).toEqual(['follow-up', 'follow-up']);
        // The feed holds a prompt twice, as the queue entry and as the turn's message; both count the same.
        const messages = yield* Feed.query(session.feed, Filter.type(Message.Message)).run;
        const count = (text: string) => messages.filter((message) => Message.extractText(message) === text).length;
        expect(count(FOLLOW_UP)).toBe(count('Hello.'));
        const followUp = messages.find((message) => Message.extractText(message) === FOLLOW_UP);
        expect(followUp?.blocks[0]).toMatchObject({ disposition: 'synthetic' });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a background hook that finishes at once still lets the process finish',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession({
          skills: [QuickHookSkill],
          instructions: yield* allHooks(),
        });
        yield* session.submitPrompt('Hello.');
        yield* session.waitForCompletion();

        const handle = yield* agentProcess(session);
        yield* Effect.promise(async () => {
          await expect.poll(() => handle.status.state, { timeout: 5_000 }).toBe(Process.State.SUCCEEDED);
        });
        // Only this skill's hook fired: the others are scoped to skills the session did not bind.
        expect(hookLog.events).toEqual(['quick']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a failing background hook still lets the process finish',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession({
          skills: [FailingHookSkill],
          instructions: yield* allHooks(),
        });
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

  it.effect(
    'a hook no setting turns on does not fire',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession({ skills: [QuickHookSkill] });
        yield* session.submitPrompt('Hello.');
        yield* session.waitForCompletion();

        const handle = yield* agentProcess(session);
        yield* Effect.promise(async () => {
          await expect.poll(() => handle.status.state, { timeout: 5_000 }).toBe(Process.State.SUCCEEDED);
        });
        expect(hookLog.events).toEqual([]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    "the space's settings apply, and the instructions override them key by key",
    Effect.fnUntraced(
      function* (_) {
        const [inline, background] = HOOKS;
        Hook.enable(yield* Database.add(Obj.make(SpaceProperties, {})), [inline, background]);
        const instructions = yield* withHooks({ [background.key]: false });

        const session = yield* AgentService.createSession({ skills: [HookSkill], instructions });
        yield* session.submitPrompt('Hello.');
        yield* session.waitForCompletion();

        expect(hookLog.events).toEqual(['inline']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
