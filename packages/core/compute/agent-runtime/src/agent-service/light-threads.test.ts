//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { expect } from 'vitest';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { Alarm, TrajectoryStore } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { type Database, type Feed } from '@dxos/echo';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN } from '@dxos/keys';
import { Reducer, type Trajectory } from '@dxos/trajectory';
import { Message } from '@dxos/types';

import { AssistantTestLayer, makeScriptedTenant } from '../testing/index.ts';
import * as AgentService from './AgentService.ts';

const { text, toolCall, scriptedAiService } = ScriptedLanguageModel;

/** Held open by the test, so the first turn is still running when the next prompt arrives. */
const Gate = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.lightGate'),
    name: 'Gate',
    description: 'Runs until the test releases it.',
  },
  input: Schema.Struct({ label: Schema.String }),
  output: Schema.String,
});

let gateStarted: Deferred.Deferred<void> | undefined;
let gateRelease: Deferred.Deferred<void> | undefined;

const handlers = OperationHandlerSet.make(
  Gate.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ label }) {
        if (gateStarted && gateRelease) {
          yield* Deferred.succeed(gateStarted, undefined);
          yield* Deferred.await(gateRelease).pipe(Effect.uninterruptible);
        }
        return `${label}: released`;
      }),
    ),
  ),
);

const GateSkill = Skill.make({
  key: 'org.dxos.skill.lightGate',
  name: 'Gate',
  tools: Skill.toolDefinitions({ operations: [Gate] }),
});

/** Requests the model saw, in call order. */
const requests: ScriptedLanguageModel.ScriptedRequest[] = [];

const afterTool = (request: ScriptedLanguageModel.ScriptedRequest) => request.prompt.content.at(-1)?.role === 'tool';

/**
 * The first prompt parks in the gate; a light thread answers its own prompt, or waits on the first thread when its
 * prompt says so.
 */
const script = (request: ScriptedLanguageModel.ScriptedRequest) => {
  requests.push(request);
  const inLightThread = request.text.includes('You are thread');
  if (inLightThread) {
    if (request.text.includes('translate') && !afterTool(request)) {
      const [, sibling] = /<thread id="([^"]+)"/.exec(request.text) ?? [];
      return { parts: [toolCall('thread_wait', { thread: sibling })] };
    }
    return { parts: [text(afterTool(request) ? 'La mer est vaste.' : '391.')] };
  }
  return {
    parts: [afterTool(request) ? text('The sea is wide.') : toolCall(Operation.toolName(Gate), { label: 'poem' })],
  };
};

/** Requests the delegation test's model saw, in call order. */
const delegationRequests: ScriptedLanguageModel.ScriptedRequest[] = [];

/**
 * The main turn delegates one task per library, waits for each subagent in turn, then compares; a subagent answers its
 * task at once.
 */
const delegationScript = (request: ScriptedLanguageModel.ScriptedRequest) => {
  delegationRequests.push(request);
  // A subagent never sees the conversation that delegated to it.
  if (!request.text.includes('Compare libraries')) {
    return { parts: [text(request.text.includes('Describe library alpha') ? 'Alpha is fast.' : 'Beta is small.')] };
  }
  // `text` holds only text parts; tool results are in the prompt, where their quotes are escaped.
  const prompt = JSON.stringify(request.prompt.content);
  const started = (purpose: string) =>
    new RegExp(`Started subagent thread (\\w+) \\(\\\\*"${purpose}`).exec(prompt)?.[1];
  const alpha = started('Alpha');
  const beta = started('Beta');
  if (alpha === undefined || beta === undefined) {
    return {
      parts: [
        toolCall('thread_delegate', { task: 'Describe library alpha.', purpose: 'Alpha' }),
        toolCall('thread_delegate', { task: 'Describe library beta.', purpose: 'Beta' }),
      ],
    };
  }
  if (!prompt.includes('Alpha is fast.')) {
    return { parts: [toolCall('thread_wait', { thread: alpha })] };
  }
  if (!prompt.includes('Beta is small.')) {
    return { parts: [toolCall('thread_wait', { thread: beta })] };
  }
  return { parts: [text('Alpha is fast; beta is small.')] };
};

const layer = () =>
  AssistantTestLayer({
    types: [Alarm.Alarm],
    operationHandlers: [handlers],
    skills: [GateSkill],
    agent: { threading: () => ({ limit: 3 }) },
    aiService: scriptedAiService(script),
  });

const read = <S>(feed: Feed.Feed, reducer: Reducer.Durable<S>) =>
  Effect.map(TrajectoryStore.load(feed, reducer), ({ state }) => state);

/** Polls the thread view until `done` holds. */
const waitFor = (feed: Feed.Feed, done: (view: Reducer.ThreadView) => boolean) =>
  Effect.gen(function* () {
    const runtime = yield* Effect.context<Database.Service>();
    yield* Effect.promise(async () => {
      await expect
        .poll(() => RuntimeProvider.runPromise(Effect.succeed(runtime))(Effect.map(read(feed, Reducer.thread), done)), {
          timeout: 15_000,
        })
        .toBe(true);
    });
  });

const itemTexts = (view: Reducer.ThreadView, lane: Trajectory.EventId) =>
  view.items
    .filter((item) => item.lane === lane)
    .map((item) => Message.extractText(Message.make({ sender: { role: 'user' }, blocks: [...item.blocks] })))
    .filter((value) => value.length > 0);

describe('light threads (scripted)', () => {
  it.effect(
    'a prompt sent while a turn runs is answered in a light thread before that turn ends',
    Effect.fnUntraced(
      function* (_) {
        requests.length = 0;
        gateStarted = yield* Deferred.make<void>();
        gateRelease = yield* Deferred.make<void>();
        const session = yield* AgentService.createSession({ skills: [GateSkill] });
        yield* session.submitPrompt('Write a poem about the sea.');
        yield* Deferred.await(gateStarted);

        yield* session.submitPrompt('What is 17 times 23?');
        // The light thread finishes while the first turn is still parked in the gate.
        yield* waitFor(session.feed, (view) => view.lanes.length === 2 && view.lanes[1].status === 'done');
        const during = yield* read(session.feed, Reducer.thread);
        expect(during.lanes.map((lane) => [lane.kind, lane.status, lane.overlapped])).toEqual([
          ['turn', 'running', true],
          ['light', 'done', true],
        ]);
        expect(itemTexts(during, during.lanes[1].id)).toEqual(['What is 17 times 23?', '391.']);

        // The light thread saw the first turn's work as another thread's, not as its own history.
        const lightRequest = requests.find((request) => request.text.includes('You are thread'));
        expect(lightRequest?.text).toContain(`<thread id="${during.lanes[0].id}"`);
        expect(lightRequest?.text).toContain('Write a poem about the sea.');

        yield* Deferred.succeed(gateRelease, undefined);
        yield* session.waitForCompletion();

        // Main holds the closure, in merge order: the light thread first, then the turn that ran beside it.
        const history = yield* TrajectoryStore.history(session.feed);
        expect(history.map((message) => Message.extractText(message)).filter((value) => value.length > 0)).toEqual([
          'What is 17 times 23?',
          '391.',
          'Write a poem about the sea.',
          'The sea is wide.',
        ]);
      },
      Effect.provide(layer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  // Live clock: the waiting tool polls the feed on a timer.
  it.live(
    'a light thread that depends on another waits for it and continues with its result',
    Effect.fnUntraced(
      function* (_) {
        requests.length = 0;
        gateStarted = yield* Deferred.make<void>();
        gateRelease = yield* Deferred.make<void>();
        const session = yield* AgentService.createSession({ skills: [GateSkill] });
        yield* session.submitPrompt('Write a poem about the sea.');
        yield* Deferred.await(gateStarted);

        yield* session.submitPrompt('Now translate the poem to French.');
        yield* waitFor(session.feed, (view) => view.lanes[1]?.status === 'waiting');
        const waiting = yield* read(session.feed, Reducer.thread);
        expect(waiting.lanes[1].waitingOn).toEqual(waiting.lanes[0].id);

        yield* Deferred.succeed(gateRelease, undefined);
        yield* session.waitForCompletion();

        const view = yield* read(session.feed, Reducer.thread);
        expect(view.lanes.map((lane) => lane.status)).toEqual(['done', 'done']);
        expect(itemTexts(view, view.lanes[1].id).at(-1)).toEqual('La mer est vaste.');
        // The wait returned the first thread's work, poem included.
        const resumed = requests.find((request) => request.text.includes('translate') && afterTool(request));
        expect(JSON.stringify(resumed?.prompt.content.at(-1))).toContain('The sea is wide.');
      },
      Effect.provide(layer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'a prompt addressed to another agent runs in a lane that agent owns, beside the default agent',
    Effect.fnUntraced(
      function* (_) {
        requests.length = 0;
        gateStarted = yield* Deferred.make<void>();
        gateRelease = yield* Deferred.make<void>();
        const session = yield* AgentService.createSession({ skills: [GateSkill] });
        yield* session.submitPrompt('Write a poem about the sea.');
        yield* Deferred.await(gateStarted);

        yield* session.submitPrompt('@claude What is 17 times 23?');
        yield* waitFor(session.feed, (view) => view.lanes.length === 2 && view.lanes[1].status === 'done');
        const during = yield* read(session.feed, Reducer.thread);
        // Every lane is a light thread owned by the agent that runs it.
        expect(during.lanes.map((lane) => [lane.kind, lane.owner.name, lane.status])).toEqual([
          ['light', 'deepseek', 'running'],
          ['light', 'claude', 'done'],
        ]);
        expect(itemTexts(during, during.lanes[1].id).at(-1)).toEqual('391, from claude.');

        yield* Deferred.succeed(gateRelease, undefined);
        yield* session.waitForCompletion();
        const done = yield* read(session.feed, Reducer.thread);
        expect(done.lanes.map((lane) => lane.status)).toEqual(['done', 'done']);
      },
      Effect.provide(
        AssistantTestLayer({
          types: [Alarm.Alarm],
          operationHandlers: [handlers],
          skills: [GateSkill],
          agent: {
            threading: () => ({
              owner: 'deepseek',
              tenants: [
                {
                  name: 'claude',
                  makeTurnProducer: makeScriptedTenant({
                    name: 'claude',
                    reply: () => ({ text: '391, from claude.' }),
                  }),
                },
              ],
            }),
          },
          aiService: scriptedAiService(script),
        }),
      ),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  // Live clock: the check that nothing more runs is a wait in real time.
  it.live(
    'agents that address each other in their replies do not prompt each other',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession();
        yield* session.submitPrompt('Plan the coffee launch.');
        yield* session.submitPrompt('@claude Scaffold the launch folder.');
        yield* session.waitForCompletion();

        const turns = (events: readonly Trajectory.Event[]) =>
          events.filter((event) => event.payload._tag === 'turnBegin').length;
        const prompts = (events: readonly Trajectory.Event[]) =>
          events.filter((event) => event.payload._tag === 'message' && event.sender.role === 'user').length;
        const settled = yield* TrajectoryStore.read(session.feed);
        expect(turns(settled)).toBe(2);
        expect(prompts(settled)).toBe(2);

        // Each reply names the other agent; neither becomes a prompt, so nothing more runs.
        yield* Effect.sleep('3 seconds');
        const later = yield* TrajectoryStore.read(session.feed);
        expect([turns(later), prompts(later)]).toEqual([2, 2]);
        const view = yield* read(session.feed, Reducer.thread);
        expect(view.lanes.map((lane) => [lane.owner.name, lane.status])).toEqual([
          ['deepseek', 'done'],
          ['claude', 'done'],
        ]);
      },
      Effect.provide(
        AssistantTestLayer({
          types: [Alarm.Alarm],
          agent: {
            threading: () => ({
              owner: 'deepseek',
              tenants: [
                {
                  name: 'claude',
                  makeTurnProducer: makeScriptedTenant({
                    name: 'claude',
                    reply: () => ({ text: '@deepseek I made the folder; can you check your plan against it?' }),
                  }),
                },
              ],
            }),
          },
          aiService: scriptedAiService(() => ({
            delay: '500 millis',
            parts: [text('Plan drafted. @claude, please confirm the folder matches it.')],
          })),
        }),
      ),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  // Live clock: the waiting tool polls the feed on a timer.
  it.live(
    'a turn delegates to subagents in background threads, waits for them and answers from their results',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession();
        yield* session.submitPrompt('Compare libraries alpha and beta.');
        yield* session.waitForCompletion();

        const view = yield* read(session.feed, Reducer.thread);
        expect(
          view.lanes.map((lane) => [lane.kind, lane.owner.name, lane.purpose, lane.status, lane.backgrounded]),
        ).toEqual([
          ['turn', undefined, undefined, 'done', undefined],
          ['fresh', 'subagent', 'Alpha', 'done', true],
          ['fresh', 'subagent', 'Beta', 'done', true],
        ]);
        const [main, alpha, beta] = view.lanes;
        expect(itemTexts(view, alpha.id)).toEqual(['Describe library alpha.', 'Alpha is fast.']);
        expect(itemTexts(view, beta.id)).toEqual(['Describe library beta.', 'Beta is small.']);
        expect(itemTexts(view, main.id).at(-1)).toEqual('Alpha is fast; beta is small.');

        // A subagent starts with its task alone, and cannot delegate in turn.
        const subagentRequests = delegationRequests.filter((request) => request.text.includes('Describe library'));
        expect(subagentRequests).toHaveLength(2);
        for (const request of subagentRequests) {
          expect(request.text).not.toContain('Compare libraries');
          expect(request.tools).not.toContain('thread_delegate');
        }

        // Only the subagents' answers join main, not their work.
        const history = (yield* TrajectoryStore.history(session.feed))
          .map((message) => Message.extractText(message))
          .filter((value) => value.length > 0);
        expect(history.filter((value) => value.startsWith('Subagent '))).toEqual([
          `Subagent "Alpha" (thread ${alpha.id}) finished:\n\nAlpha is fast.`,
          `Subagent "Beta" (thread ${beta.id}) finished:\n\nBeta is small.`,
        ]);
        expect(history).not.toContain('Describe library alpha.');
      },
      Effect.provide(
        AssistantTestLayer({
          types: [Alarm.Alarm],
          agent: { threading: () => ({ limit: 3 }) },
          aiService: scriptedAiService(delegationScript),
        }),
      ),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );
});
