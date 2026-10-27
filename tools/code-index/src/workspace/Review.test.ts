//
// Copyright 2026 DXOS.org
//

import * as AiError from 'effect/ai/AiError';
import * as LanguageModel from 'effect/ai/LanguageModel';
import type * as Response from 'effect/ai/Response';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schedule from 'effect/Schedule';
import * as Stream from 'effect/Stream';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import * as Agent from './Agent.ts';
import * as Events from './Events.ts';
import * as Log from './Log.ts';
import type * as Models from './Models.ts';
import * as Review from './Review.ts';
import * as Sandbox from './Sandbox.ts';
import * as Telemetry from './Telemetry.ts';

const selection: Models.Selection = { provider: 'anthropic', model: 'claude-test' };

const entries = (events: readonly Events.Event[]): Events.Entry[] =>
  events.map((event, index) => ({ projectId: 'p', seq: index + 1, event }));

const call = (callId: string, code: string, ok: boolean, output = ''): Events.Event[] => [
  new Events.ToolCall({ callId, code, turnId: 't' }),
  new Events.ToolResult({ callId, ok, output }),
];

const turnOf = (events: readonly Events.Event[]) => {
  const turn = Review.turnOf(entries(events), 't');
  if (turn === undefined) {
    throw new Error('turn did not close');
  }
  return turn;
};

/** A judge that replies with `verdict` as the structured output, or fails. */
const judgeModel = (verdict: Review.Verdict | AiError.AiError): Layer.Layer<LanguageModel.LanguageModel> =>
  Layer.effect(
    LanguageModel.LanguageModel,
    LanguageModel.make({
      generateText: () =>
        verdict instanceof AiError.AiError
          ? Effect.fail(verdict)
          : Effect.succeed<Response.PartEncoded[]>([{ type: 'text', text: JSON.stringify(verdict) }]),
      streamText: () => Stream.empty,
    }),
  );

const troubled: Review.Verdict = {
  trouble: true,
  category: 'prompt',
  severity: 'medium',
  summary: 'The docs never say `query` takes a prefix map, so the agent guessed it three times.',
  evidence: 'Calls 1-3 fail with "unknown prefix".',
};

describe('Review', () => {
  describe('signals', () => {
    test('a turn is the run from its message to its closing event', ({ expect }) => {
      const events = [
        new Events.UserMessage({ text: 'earlier', turnId: 'before' }),
        new Events.TurnEnded({ steps: 1, turnId: 'before' }),
        new Events.UserMessage({ text: 'now', turnId: 't' }),
        ...call('c1', 'return 1;', true),
        new Events.TurnEnded({ steps: 2, turnId: 't' }),
      ];
      const turn = turnOf(events);
      expect([turn.start, turn.end]).toEqual([3, 6]);
      expect(Review.turnOf(entries(events.slice(0, 5)), 't')).toBeUndefined();
    });

    test('counts failures, retries and repeats, and flags a struggling turn', ({ expect }) => {
      const turn = turnOf([
        new Events.UserMessage({ text: 'show deps', turnId: 't' }),
        new Events.StepRetried({ message: 'bad JSON', turnId: 't' }),
        ...call('c1', 'return q();', false, 'unknown prefix'),
        ...call('c2', 'return q(); ', false, 'unknown prefix'),
        new Events.Presented({ callId: 'c2', kind: 'markdown', content: 'hi' }),
        new Events.TurnEnded({ steps: 3, turnId: 't' }),
      ]);
      const found = Review.signals(turn);
      expect(found).toEqual({
        outcome: 'ended',
        steps: 4,
        toolCalls: 2,
        toolErrors: 2,
        retries: 1,
        repeatedCalls: 1,
        displayed: 1,
      });
      expect(Review.suspicious(found)).toBe(true);
    });

    test('a turn that explored once and answered is not suspicious', ({ expect }) => {
      const found = Review.signals(
        turnOf([
          new Events.UserMessage({ text: 'show deps', turnId: 't' }),
          ...call('c1', 'return a();', false, 'oops'),
          ...call('c2', 'return b();', true),
          ...call('c3', 'return c();', true),
          new Events.TurnEnded({ steps: 4, turnId: 't' }),
        ]),
      );
      expect(Review.suspicious(found)).toBe(false);
      expect(Review.suspicious({ ...found, outcome: 'failed' })).toBe(true);
    });

    test('the transcript numbers calls and cuts long outputs', ({ expect }) => {
      const text = Review.transcript(
        turnOf([
          new Events.UserMessage({ text: 'show deps', turnId: 't' }),
          ...call('c1', 'return 1;', false, 'x'.repeat(5_000)),
          new Events.TurnFailed({ message: 'Gave up.', turnId: 't' }),
        ]),
      );
      expect(text).toContain('CALL 1:');
      expect(text).toContain('RESULT 1 (error)');
      expect(text).toContain('3000 more characters');
      expect(text).toContain('TURN FAILED: Gave up.');
    });
  });

  describe('review', () => {
    let dir: string;

    beforeAll(async () => {
      dir = await mkdtemp(join(tmpdir(), 'code-index-review-'));
    });

    afterAll(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    const reviewed = (
      projectId: string,
      events: readonly Events.Event[],
      judge: Layer.Layer<LanguageModel.LanguageModel>,
      sampleRate = 0,
    ) => {
      const telemetry = Telemetry.recording();
      return EffectEx.runPromise(
        Effect.gen(function* () {
          const log = yield* Log.Log;
          yield* log.createProject({ id: projectId });
          for (const event of events) {
            yield* log.append(projectId, event);
          }
          yield* Review.review({ projectId, turnId: 't', system: 'SYSTEM', selection, sampleRate });
          return telemetry;
        }).pipe(Effect.provide(Layer.mergeAll(Log.layer(dir), telemetry.layer, judge)), Effect.scoped),
      );
    };

    test('a troubled turn uploads its trajectory and reports where it went', async ({ expect }) => {
      const events = [
        new Events.UserMessage({ text: 'earlier', turnId: 'before' }),
        new Events.TurnEnded({ steps: 1, turnId: 'before' }),
        new Events.UserMessage({ text: 'show deps', turnId: 't' }),
        ...call('c1', 'return q();', false, 'unknown prefix'),
        ...call('c2', 'return q();', false, 'unknown prefix'),
        new Events.TurnEnded({ steps: 3, turnId: 't' }),
      ];
      const telemetry = await reviewed('troubled', events, judgeModel(troubled));

      expect(telemetry.events.map((entry) => entry.event)).toEqual([Review.REVIEWED_EVENT, Review.TROUBLE_EVENT]);
      const report = telemetry.events[1].properties;
      expect(report).toMatchObject({
        category: 'prompt',
        severity: 'medium',
        summary: troubled.summary,
        judged: true,
        model: 'claude-test',
        tool_errors: 2,
        repeated_calls: 1,
      });

      expect(telemetry.uploads).toHaveLength(1);
      const [upload] = telemetry.uploads;
      expect(report.r2_key).toEqual(upload.key);
      expect(upload.key).toMatch(/^code-index\/trajectories\/\d{4}-\d{2}-\d{2}\/t\.ndjson\.gz$/);
      const lines = gunzipSync(upload.body)
        .toString()
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
      expect(lines[0]).toMatchObject({ kind: 'code-index/trajectory', system: 'SYSTEM', turn: { start: 3, end: 8 } });
      // The conversation before the turn travels with it.
      expect(lines.slice(1).map((line) => line.event._tag)).toEqual(events.map((event) => event._tag));
    });

    test('a clean turn is counted but neither judged nor uploaded', async ({ expect }) => {
      const telemetry = await reviewed(
        'clean',
        [
          new Events.UserMessage({ text: 'show deps', turnId: 't' }),
          ...call('c1', 'return 1;', true),
          new Events.TurnEnded({ steps: 2, turnId: 't' }),
        ],
        judgeModel(troubled),
      );
      expect(telemetry.events).toHaveLength(1);
      expect(telemetry.events[0].properties).toMatchObject({ trouble: false, judged: false, category: 'none' });
      expect(telemetry.uploads).toHaveLength(0);
    });

    test('a failed turn is reported even when the judge cannot answer', async ({ expect }) => {
      const unavailable = new AiError.AiError({
        module: 'test',
        method: 'generateText',
        reason: new AiError.InvalidOutputError({ description: 'connection refused' }),
      });
      const telemetry = await reviewed(
        'unjudged',
        [
          new Events.UserMessage({ text: 'show deps', turnId: 't' }),
          new Events.TurnFailed({ message: 'Gave up after 20 steps.', turnId: 't' }),
        ],
        judgeModel(unavailable),
      );
      expect(telemetry.uploads).toHaveLength(1);
      expect(telemetry.events[1].properties).toMatchObject({
        judged: false,
        category: 'unknown',
        summary: 'The turn failed: Gave up after 20 steps.',
      });
    });
  });

  test('the agent schedules a review once a turn closes', async ({ expect }) => {
    const dir = await mkdtemp(join(tmpdir(), 'code-index-review-agent-'));
    const telemetry = Telemetry.recording();
    const unusable = new AiError.AiError({
      module: 'test',
      method: 'streamText',
      reason: new AiError.UnknownError({ description: 'HTTP 500: model not found' }),
    });
    const agentModel = Layer.effect(
      LanguageModel.LanguageModel,
      LanguageModel.make({ generateText: () => Effect.fail(unusable), streamText: () => Stream.fail(unusable) }),
    );
    const sandbox = Layer.succeed(Sandbox.Sandbox, {
      run: () => Effect.succeed({ ok: true, output: '', presented: [] }),
    });
    const log = Log.layer(dir);
    const reviewer = Review.layer({ selection, sampleRate: 0 }).pipe(
      Layer.provide(Layer.mergeAll(log, telemetry.layer, judgeModel(troubled))),
    );
    try {
      await EffectEx.runPromise(
        Effect.gen(function* () {
          const agent = yield* Agent.Agent;
          yield* (yield* Log.Log).createProject({ id: 'agent' });
          yield* agent.turn({ projectId: 'agent', text: 'show deps', turnId: 't' }).pipe(Effect.ignore);
          // The review runs apart from the turn; wait for it rather than for a fixed time.
          yield* Effect.suspend(() =>
            telemetry.events.length >= 2 ? Effect.void : Effect.fail('pending' as const),
          ).pipe(Effect.retry(Schedule.spaced('20 millis')), Effect.timeout('5 seconds'));
        }).pipe(
          Effect.provide(Agent.layer.pipe(Layer.provideMerge(Layer.mergeAll(sandbox, agentModel, log, reviewer)))),
          Effect.scoped,
        ),
      );
      expect(telemetry.events.map((entry) => entry.event)).toEqual([Review.REVIEWED_EVENT, Review.TROUBLE_EVENT]);
      expect(telemetry.events[1].properties).toMatchObject({ outcome: 'failed', turn_id: 't' });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
