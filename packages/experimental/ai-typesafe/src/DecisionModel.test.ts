//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as DecisionModel from './DecisionModel.ts';
import { DecisionSchemaError } from './errors.ts';
import * as TypeSafeClient from './TypeSafeClient.ts';

const TICKET = 'Our production database is down and customers cannot check out. We need help NOW.';

// Captures the request a schema compiles to and replays canned answers, so the compilation and the
// decoding are tested without a round trip to the model.
const stub = (answers: Record<string, DecisionModel.Answer>) => {
  const requests: DecisionModel.EvaluateRequest[] = [];
  const layer = DecisionModel.layer({
    evaluate: (request) =>
      Effect.sync(() => {
        requests.push(request);
        return { answers };
      }),
  });

  return { layer, requests };
};

describe('DecisionModel', () => {
  test('a noul field asks its description and answers with the truth value', async ({ expect }) => {
    const { layer, requests } = stub({ urgent: { type: 'noul', noul: 0.99 } });
    const schema = Schema.Struct({
      urgent: DecisionModel.Noul.annotate({ description: 'Does this convey urgency?' }),
    });

    const result = await EffectEx.runPromise(
      DecisionModel.generate({ context: TICKET, schema }).pipe(Effect.provide(layer)),
    );

    expect(requests[0].questions.urgent).toEqual({ type: 'noul', instructions: 'Does this convey urgency?' });
    expect(result.urgent).toBe(0.99);
  });

  test('a choice keeps the confidence; a bare literal union drops it', async ({ expect }) => {
    const answer: DecisionModel.Answer = { type: 'choice', choice: 'technical', confidence: 1 };
    const { layer, requests } = stub({ team: answer, queue: answer });
    const schema = Schema.Struct({
      team: DecisionModel.Choice('billing', 'technical', 'sales').annotate({
        description: 'Which team should handle this?',
      }),
      queue: Schema.Literals(['billing', 'technical', 'sales']).annotate({
        description: 'Which queue should this land in?',
      }),
    });

    const result = await EffectEx.runPromise(
      DecisionModel.generate({ context: TICKET, schema }).pipe(Effect.provide(layer)),
    );

    // Both compile to the same question — only what the caller declared differs.
    expect(requests[0].questions.team).toEqual({
      type: 'choice',
      instructions: 'Which team should handle this?',
      criteria: { billing: 'billing', technical: 'technical', sales: 'sales' },
    });
    expect(result.team).toEqual({ _tag: 'technical', confidence: 1 });
    expect(result.queue).toBe('technical');
  });

  test('choice criteria may be given as the descriptions the model scores against', async ({ expect }) => {
    const { layer, requests } = stub({ team: { type: 'choice', choice: 'billing', confidence: 0.8 } });
    const schema = Schema.Struct({
      team: DecisionModel.Choice({
        billing: 'Payments, invoicing, refunds',
        technical: 'Bugs, outages, integrations',
      }).annotate({ description: 'Which team should handle this?' }),
    });

    const result = await EffectEx.runPromise(
      DecisionModel.generate({ context: TICKET, schema }).pipe(Effect.provide(layer)),
    );

    expect(requests[0].questions.team).toEqual({
      type: 'choice',
      instructions: 'Which team should handle this?',
      criteria: { billing: 'Payments, invoicing, refunds', technical: 'Bugs, outages, integrations' },
    });
    expect(result.team._tag).toBe('billing');
  });

  test('a score asks its ordered criteria and answers a position on that scale', async ({ expect }) => {
    const { layer, requests } = stub({
      frustration: { type: 'score', score: 1.66, confidence: 0.49, legend: { 0: 'Calm', 1: 'Frustrated' } },
    });
    const schema = Schema.Struct({
      frustration: DecisionModel.Score('Calm', 'Frustrated', 'Very angry').annotate({
        description: 'How frustrated is the customer?',
      }),
    });

    const result = await EffectEx.runPromise(
      DecisionModel.generate({ context: TICKET, schema }).pipe(Effect.provide(layer)),
    );

    expect(requests[0].questions.frustration).toEqual({
      type: 'score',
      instructions: 'How frustrated is the customer?',
      criteria: ['Calm', 'Frustrated', 'Very angry'],
    });
    expect(result.frustration).toEqual({ score: 1.66, confidence: 0.49 });
  });

  test('a boolean field is a noul thresholded at the midpoint', async ({ expect }) => {
    const schema = Schema.Struct({
      urgent: Schema.Boolean.annotate({ description: 'Does this convey urgency?' }),
    });

    const run = (noul: number) =>
      EffectEx.runPromise(
        DecisionModel.generate({ context: TICKET, schema }).pipe(
          Effect.provide(stub({ urgent: { type: 'noul', noul } }).layer),
        ),
      );

    expect((await run(0.92)).urgent).toBe(true);
    expect((await run(0.5)).urgent).toBe(true);
    expect((await run(0.3)).urgent).toBe(false);
  });

  test('every question type rides one call, evaluated against the same state', async ({ expect }) => {
    const { layer, requests } = stub({
      urgent: { type: 'noul', noul: 0.99 },
      team: { type: 'choice', choice: 'technical', confidence: 1 },
      frustration: { type: 'score', score: 1.66, confidence: 0.49 },
    });
    const schema = Schema.Struct({
      urgent: DecisionModel.Noul.annotate({ description: 'Does this convey urgency?' }),
      team: DecisionModel.Choice('billing', 'technical', 'sales').annotate({ description: 'Which team?' }),
      frustration: DecisionModel.Score('Calm', 'Frustrated', 'Very angry').annotate({ description: 'How frustrated?' }),
    });

    const result = await EffectEx.runPromise(
      DecisionModel.generate({ context: TICKET, schema }).pipe(Effect.provide(layer)),
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].state).toBe(TICKET);
    expect(Object.keys(requests[0].questions)).toEqual(['urgent', 'team', 'frustration']);
    expect(result.urgent).toBe(0.99);
    expect(result.team._tag).toBe('technical');
    expect(result.frustration.score).toBe(1.66);
  });

  test('a field with no description cannot be asked', async ({ expect }) => {
    const schema = Schema.Struct({ urgent: DecisionModel.Noul });

    const error = await EffectEx.runPromise(
      DecisionModel.generate({ context: TICKET, schema }).pipe(Effect.provide(stub({}).layer), Effect.flip),
    );

    expect(error).toBeInstanceOf(DecisionSchemaError);
  });

  test('a field that is not a question is rejected at compile time of the request', async ({ expect }) => {
    const schema = Schema.Struct({ summary: Schema.String.annotate({ description: 'Summarize the ticket.' }) });

    const error = await EffectEx.runPromise(
      DecisionModel.generate({ context: TICKET, schema }).pipe(Effect.provide(stub({}).layer), Effect.flip),
    );

    expect(error).toBeInstanceOf(DecisionSchemaError);
  });

  test('an answer of the wrong kind is rejected before it is decoded', async ({ expect }) => {
    // A choice payload under a question that asked for a score would otherwise decode to undefined.
    const { layer } = stub({ frustration: { type: 'choice', choice: 'technical', confidence: 1 } });
    const schema = Schema.Struct({
      frustration: DecisionModel.Score('Calm', 'Frustrated').annotate({ description: 'How frustrated?' }),
    });

    const error = await EffectEx.runPromise(
      DecisionModel.generate({ context: TICKET, schema }).pipe(Effect.provide(layer), Effect.flip),
    );

    expect(error.message).toMatch(/Decision request failed/);
  });

  test('an unanswered question fails rather than yielding undefined', async ({ expect }) => {
    const { layer } = stub({});
    const schema = Schema.Struct({
      urgent: DecisionModel.Noul.annotate({ description: 'Does this convey urgency?' }),
    });

    const error = await EffectEx.runPromise(
      DecisionModel.generate({ context: TICKET, schema }).pipe(Effect.provide(layer), Effect.flip),
    );

    expect(error.message).toMatch(/Decision request failed/);
  });

  test('a score outside the declared scale is not a valid answer', async ({ expect }) => {
    const { layer } = stub({ frustration: { type: 'score', score: 3.2, confidence: 0.5 } });
    const schema = Schema.Struct({
      frustration: DecisionModel.Score('Calm', 'Frustrated', 'Very angry').annotate({ description: 'How frustrated?' }),
    });

    const error = await EffectEx.runPromise(
      DecisionModel.generate({ context: TICKET, schema }).pipe(Effect.provide(layer), Effect.flip),
    );

    expect(error.message).toMatch(/Decision request failed/);
  });

  test('an answer that violates the schema fails rather than being handed back', async ({ expect }) => {
    const { layer } = stub({ team: { type: 'choice', choice: 'technical', confidence: 1.4 } });
    const schema = Schema.Struct({
      team: DecisionModel.Choice('billing', 'technical').annotate({ description: 'Which team?' }),
    });

    const error = await EffectEx.runPromise(
      DecisionModel.generate({ context: TICKET, schema }).pipe(Effect.provide(layer), Effect.flip),
    );

    expect(error.message).toMatch(/Decision request failed/);
  });
});

describe('TypeSafeClient', () => {
  test('posts the questions to the System One endpoint', async ({ expect }) => {
    type Call = {
      url: string;
      body: { model: string; state: unknown; questions: Record<string, DecisionModel.Question> };
      headers: Record<string, string>;
    };
    const calls: Call[] = [];
    const layer = DecisionModel.layer(
      TypeSafeClient.make({
        apiKey: Redacted.make('test-key'),
        fetch: async (url, init) => {
          calls.push({
            url: String(url),
            body: JSON.parse(String(init?.body)),
            headers: init?.headers as Record<string, string>,
          });
          return new Response(
            JSON.stringify({ model: 'jev-1.13.0', answers: { urgent: { type: 'noul', noul: 0.9 } } }),
          );
        },
      }),
    );

    const schema = Schema.Struct({ urgent: DecisionModel.Noul.annotate({ description: 'Urgent?' }) });
    const result = await EffectEx.runPromise(
      DecisionModel.generate({ context: TICKET, schema }).pipe(Effect.provide(layer)),
    );

    expect(calls[0].url).toBe(TypeSafeClient.DEFAULT_ENDPOINT);
    expect(calls[0].headers.Authorization).toBe('Bearer test-key');
    expect(calls[0].body.model).toBe(TypeSafeClient.DEFAULT_MODEL);
    expect(calls[0].body.state).toBe(TICKET);
    expect(result.urgent).toBe(0.9);
  });

  test('a 200 with a malformed body surfaces as a decision error', async ({ expect }) => {
    const layer = DecisionModel.layer(
      TypeSafeClient.make({
        apiKey: Redacted.make('test-key'),
        fetch: async () => new Response(JSON.stringify({ model: 'jev-1.13.0' })),
      }),
    );

    const schema = Schema.Struct({ urgent: DecisionModel.Noul.annotate({ description: 'Urgent?' }) });
    const error = await EffectEx.runPromise(
      DecisionModel.generate({ context: TICKET, schema }).pipe(Effect.provide(layer), Effect.flip),
    );

    expect(error.message).toMatch(/Decision request failed/);
  });

  test('a failed request surfaces as a decision error', async ({ expect }) => {
    const layer = DecisionModel.layer(
      TypeSafeClient.make({
        apiKey: Redacted.make('test-key'),
        fetch: async () => new Response('nope', { status: 401, statusText: 'Unauthorized' }),
      }),
    );

    const schema = Schema.Struct({ urgent: DecisionModel.Noul.annotate({ description: 'Urgent?' }) });
    const error = await EffectEx.runPromise(
      DecisionModel.generate({ context: TICKET, schema }).pipe(Effect.provide(layer), Effect.flip),
    );

    expect(error.message).toMatch(/Decision request failed/);
  });

  test('answers a mixed schema against the live model', { timeout: 60_000, tags: ['manual'] }, async ({ expect }) => {
    const apiKey = process.env.TYPESAFE_API_KEY ?? '';
    expect(apiKey, 'TYPESAFE_API_KEY is required for this test').not.toBe('');

    const schema = Schema.Struct({
      urgent: DecisionModel.Noul.annotate({ description: 'Does this convey urgency?' }),
      team: DecisionModel.Choice({
        billing: 'Payments, invoicing, refunds',
        technical: 'Bugs, outages, integrations',
        sales: 'Pricing, upgrades, new accounts',
      }).annotate({ description: 'Which team should handle this?' }),
      frustration: DecisionModel.Score('Calm', 'Frustrated', 'Very angry').annotate({
        description: 'How frustrated is the customer?',
      }),
      escalate: Schema.Boolean.annotate({ description: 'Should this be escalated to an on-call engineer?' }),
    });

    const result = await EffectEx.runPromise(
      DecisionModel.generate({ context: TICKET, schema }).pipe(
        Effect.provide(TypeSafeClient.layer({ apiKey: Redacted.make(apiKey) })),
      ),
    );

    expect(result.urgent).toBeGreaterThan(0.5);
    expect(result.team._tag).toBe('technical');
    expect(result.frustration.score).toBeGreaterThan(0);
    expect(result.escalate).toBe(true);
  });
});
