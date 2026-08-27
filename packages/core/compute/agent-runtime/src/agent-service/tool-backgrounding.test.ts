//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Deferred from 'effect/Deferred';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as TestClock from 'effect/testing/TestClock';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';

import { AssistantTestLayer } from '../testing';
import * as AgentService from './AgentService';

const { text, toolCall, scriptedAiService } = ScriptedLanguageModel;

EntityId.dangerouslyDisableRandomness();

/** Mirrors `ToolExecutionService`'s default; the tests advance virtual time past it. */
const BACKGROUND_THRESHOLD = Duration.seconds(1);

/**
 * Bound on {@link waitForModelCalls}. A low ceiling keeps a regression failing on an assertion
 * rather than hanging until the suite timeout.
 */
const MAX_ATTEMPTS = 20;

/**
 * One macrotask turn. Needed despite the virtual clock: a woken continuation crosses promise
 * boundaries (the model call and its stream) that a fiber-level `yieldNow` does not drain. It
 * costs no wall time — the delay is 0 and nothing waits on real duration.
 */
const macrotask = Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 0)));

/**
 * Latches the test uses to hold a tool call open for as long as it likes without any real time
 * passing: the handler parks on `release`, which the test resolves once it has driven the clock.
 */
interface SlowWorkHarness {
  /** Resolved by the handler once the tool call is executing. */
  started?: Deferred.Deferred<void>;
  /** Resolved by the test to let the tool call produce its result. */
  release?: Deferred.Deferred<string, Error>;
}

const slowWorkHarness: SlowWorkHarness = {};

const SlowWork = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.slowWork'),
    name: 'Slow work',
    description: 'Performs a unit of work that completes only when the test releases it',
  },
  input: Schema.Struct({
    label: Schema.String.annotate({ description: 'Label echoed back with the result' }),
  }),
  output: Schema.String,
});

const handlers = OperationHandlerSet.make(
  SlowWork.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ label }) {
        const { started, release } = slowWorkHarness;
        if (started == null || release == null) {
          return yield* Effect.die(new Error('Slow work harness not armed.'));
        }
        yield* Deferred.succeed(started, undefined);
        // Dies rather than declaring an error channel: the executor reads the child's `Exit`, so a
        // defect exercises the same failure path a thrown tool error would.
        return `${label}: ${yield* Deferred.await(release).pipe(Effect.orDie)}`;
      }),
    ),
  ),
);

const SlowWorkSkill = Skill.make({
  key: 'org.dxos.skill.slowWork',
  name: 'Slow work',
  tools: Skill.toolDefinitions({ operations: [SlowWork] }),
});

/**
 * Builds a layer whose scripted model records the text of every prompt it is handed. The recording
 * is what distinguishes a backgrounded call from a synchronous one: only the former hands the model
 * the "running in the background" marker, and only the former delivers the real result in a later
 * turn of its own.
 */
const makeTestLayer = (turns: readonly ScriptedLanguageModel.ScriptedTurn[]) => {
  const prompts: string[] = [];
  return {
    prompts,
    layer: AssistantTestLayer({
      agent: { enableToolBackgrounding: true },
      operationHandlers: [handlers],
      skills: [SlowWorkSkill],
      // Single route, so `match` runs exactly once per model call and doubles as the recorder.
      aiService: scriptedAiService([
        {
          name: 'agent',
          match: (request) => {
            // The whole prompt, not `request.text`: the backgrounding marker comes back as a
            // tool-result part, which `text` (text parts only) does not see.
            prompts.push(JSON.stringify(request.prompt.content));
            return true;
          },
          turns,
        },
      ]),
    }),
  };
};

/** Arms the harness latches for one tool call. */
const armHarness = Effect.gen(function* () {
  slowWorkHarness.started = yield* Deferred.make<void>();
  slowWorkHarness.release = yield* Deferred.make<string, Error>();
  return { started: slowWorkHarness.started, release: slowWorkHarness.release };
});

/**
 * Drives the agent until the model has been called `count` times, advancing virtual time so a
 * pending backgrounding threshold elapses. Deterministic: no real time passes, the tool parks on a
 * `Deferred` rather than a sleep, and over-advancing is harmless.
 *
 * `Session.waitForCompletion` cannot stand in for this: it settles on the *turn*, so it returns
 * while a backgrounded call is still outstanding (the same gap `waitForMessage` exists to cover).
 */
const waitForModelCalls = (prompts: readonly string[], count: number) =>
  Effect.gen(function* () {
    for (let attempt = 0; attempt < MAX_ATTEMPTS && prompts.length < count; attempt++) {
      yield* TestClock.adjust(BACKGROUND_THRESHOLD);
      yield* macrotask;
    }
  });

/** Gives any further model call a chance to land, without advancing the clock. */
const drain = Effect.gen(function* () {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    yield* macrotask;
  }
});

const backgrounded = makeTestLayer([
  { parts: [toolCall(Operation.toolName(SlowWork), { label: 'alpha' })] },
  // Reached only once the call is detached: the tool is still parked at this point.
  { parts: [text('Started it; I will report back when it finishes.')] },
  // Reached only once the completion notification is folded back in as a new turn.
  { parts: [text('The slow work finished.')] },
]);

const synchronous = makeTestLayer([
  { parts: [toolCall(Operation.toolName(SlowWork), { label: 'beta' })] },
  { parts: [text('Finished inline.')] },
]);

const failing = makeTestLayer([
  { parts: [toolCall(Operation.toolName(SlowWork), { label: 'gamma' })] },
  { parts: [text('Started it; I will report back when it finishes.')] },
  { parts: [text('The slow work failed.')] },
]);

describe('tool backgrounding', () => {
  it.effect(
    'detaches a call that exceeds the threshold and folds the result back in a later turn',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { prompts } = backgrounded;
        const { started, release } = yield* armHarness;
        const session = yield* AgentService.createSession({ skills: [SlowWorkSkill] });

        yield* session.submitPrompt('Do the slow work.');
        yield* Deferred.await(started);
        yield* waitForModelCalls(prompts, 2);

        // The turn continued without the tool: the model was told the call went to the background.
        expect(prompts).toHaveLength(2);
        expect(prompts[1]).toContain('running in the background');

        yield* Deferred.succeed(release, 'done');
        yield* waitForModelCalls(prompts, 3);

        // ...and the real result arrived as a turn of its own, not as a result of the first turn.
        expect(prompts).toHaveLength(3);
        expect(prompts[2]).toContain('<result pid=');
        expect(prompts[2]).toContain('alpha: done');
      },
      Effect.provide(backgrounded.layer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 15_000 },
  );

  it.effect(
    'returns a call that completes under the threshold inline, with no background turn',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { prompts } = synchronous;
        const { started, release } = yield* armHarness;
        const session = yield* AgentService.createSession({ skills: [SlowWorkSkill] });

        yield* session.submitPrompt('Do the slow work.');
        // Released without advancing the clock, so the threshold never elapses.
        yield* Deferred.await(started);
        yield* Deferred.succeed(release, 'done');
        yield* session.waitForCompletion();
        yield* drain;

        // Two calls: the tool call and the continuation. A third would mean the synchronously
        // reported result was redelivered as a notification turn as well.
        expect(prompts).toHaveLength(2);
        expect(prompts.join('\n')).not.toContain('running in the background');
        expect(prompts[1]).toContain('beta: done');
      },
      Effect.provide(synchronous.layer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 15_000 },
  );

  it.effect(
    'reports a backgrounded call that fails, rather than dropping it',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { prompts } = failing;
        const { started, release } = yield* armHarness;
        const session = yield* AgentService.createSession({ skills: [SlowWorkSkill] });

        yield* session.submitPrompt('Do the slow work.');
        yield* Deferred.await(started);
        yield* waitForModelCalls(prompts, 2);
        expect(prompts[1]).toContain('running in the background');

        yield* Deferred.fail(release, new Error('slow work exploded'));
        yield* waitForModelCalls(prompts, 3);

        expect(prompts).toHaveLength(3);
        expect(prompts[2]).toContain('<error pid=');
        expect(prompts[2]).toContain('slow work exploded');
      },
      Effect.provide(failing.layer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 15_000 },
  );
});
