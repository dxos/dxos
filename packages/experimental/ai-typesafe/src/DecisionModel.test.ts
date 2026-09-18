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

const OUTAGE = 'Our production database is down and customers cannot check out. We need help NOW.';
const PRICING = 'Hi, whenever you have a moment — could you send me a quote for the team plan? No rush at all.';

const apiKey = () => Redacted.make(process.env.TYPESAFE_API_KEY ?? '');

/** A question schema built from plain fields, so decoding its answers needs no services. */
type QuestionSchema = Schema.Struct<Schema.Struct.Fields> & { readonly DecodingServices: never };

const ask = <S extends QuestionSchema>(context: unknown, schema: S): Promise<S['Type']> =>
  EffectEx.runPromise(
    DecisionModel.generate({ context, schema }).pipe(Effect.provide(TypeSafeClient.layer({ apiKey: apiKey() }))),
  );

// Every test here asks the real System One endpoint. The key is not available in CI, so the suite is
// tagged `manual`: run it with `DX_RUN_MANUAL_TESTS=1` and `TYPESAFE_API_KEY` set.
describe('DecisionModel against the live model', { timeout: 60_000, tags: ['manual'] }, () => {
  test('a noul answers a truth value that tracks the state', async ({ expect }) => {
    const schema = Schema.Struct({
      urgent: DecisionModel.Noul.annotate({ description: 'Does this convey urgency?' }),
    });

    const [outage, pricing] = await Promise.all([ask(OUTAGE, schema), ask(PRICING, schema)]);

    expect(outage.urgent).toBeGreaterThan(0.5);
    expect(pricing.urgent).toBeLessThan(0.5);
  });

  test('a choice routes to the right option and reports its confidence', async ({ expect }) => {
    const schema = Schema.Struct({
      team: DecisionModel.Choice({
        billing: 'Payments, invoicing, refunds',
        technical: 'Bugs, outages, integrations',
        sales: 'Pricing, upgrades, new accounts',
      }).annotate({ description: 'Which team should handle this?' }),
    });

    const [outage, pricing] = await Promise.all([ask(OUTAGE, schema), ask(PRICING, schema)]);

    expect(outage.team._tag).toBe('technical');
    expect(pricing.team._tag).toBe('sales');
    expect(outage.team.confidence).toBeGreaterThan(0);
    expect(outage.team.confidence).toBeLessThanOrEqual(1);
  });

  test('a bare literal union answers the same question without the confidence', async ({ expect }) => {
    const schema = Schema.Struct({
      queue: Schema.Literals(['billing', 'technical', 'sales']).annotate({
        description: 'Which queue should this land in? technical means bugs, outages and integrations.',
      }),
    });

    const result = await ask(OUTAGE, schema);

    expect(result.queue).toBe('technical');
    expect(Object.keys(result)).toEqual(['queue']);
  });

  test('a score places the state on the declared scale', async ({ expect }) => {
    const schema = Schema.Struct({
      frustration: DecisionModel.Score('Calm', 'Frustrated', 'Very angry').annotate({
        description: 'How frustrated is the customer?',
      }),
    });

    const [outage, pricing] = await Promise.all([ask(OUTAGE, schema), ask(PRICING, schema)]);

    expect(outage.frustration.score).toBeGreaterThan(pricing.frustration.score);
    // The scale is the criteria themselves; a position outside them would have failed decoding.
    expect(outage.frustration.score).toBeLessThanOrEqual(2);
    expect(pricing.frustration.score).toBeGreaterThanOrEqual(0);
  });

  test('a boolean field decides rather than reporting a probability', async ({ expect }) => {
    const schema = Schema.Struct({
      escalate: Schema.Boolean.annotate({ description: 'Should this be escalated to an on-call engineer?' }),
    });

    const [outage, pricing] = await Promise.all([ask(OUTAGE, schema), ask(PRICING, schema)]);

    expect(outage.escalate).toBe(true);
    expect(pricing.escalate).toBe(false);
  });

  test('every question type rides one call against the same state', async ({ expect }) => {
    const schema = Schema.Struct({
      urgent: DecisionModel.Noul.annotate({ description: 'Does this convey urgency?' }),
      team: DecisionModel.Choice('billing', 'technical', 'sales').annotate({
        description: 'Which team should handle this? technical means bugs, outages and integrations.',
      }),
      frustration: DecisionModel.Score('Calm', 'Frustrated', 'Very angry').annotate({
        description: 'How frustrated is the customer?',
      }),
      escalate: Schema.Boolean.annotate({ description: 'Should this be escalated to an on-call engineer?' }),
    });

    const result = await ask(OUTAGE, schema);

    expect(result.urgent).toBeGreaterThan(0.5);
    expect(result.team._tag).toBe('technical');
    expect(result.frustration.score).toBeGreaterThan(0);
    expect(result.escalate).toBe(true);
  });

  test('the model answers a state that is an object, not just prose', async ({ expect }) => {
    const schema = Schema.Struct({
      team: DecisionModel.Choice({
        billing: 'Payments, invoicing, refunds',
        technical: 'Bugs, outages, integrations',
      }).annotate({ description: 'Which team should handle this ticket?' }),
    });

    const result = await ask({ subject: 'Double charged for March', body: 'My card was billed twice.' }, schema);

    expect(result.team._tag).toBe('billing');
  });

  test('a rejected key surfaces as a decision error', async ({ expect }) => {
    const schema = Schema.Struct({ urgent: DecisionModel.Noul.annotate({ description: 'Urgent?' }) });

    const error = await EffectEx.runPromise(
      DecisionModel.generate({ context: OUTAGE, schema }).pipe(
        Effect.provide(TypeSafeClient.layer({ apiKey: Redacted.make('not-a-key') })),
        Effect.flip,
      ),
    );

    expect(error.message).toMatch(/Decision request failed/);
  });
});

// These never reach the network: the schema is rejected before a request is built.
describe('DecisionModel schema compilation', () => {
  const rejects = async (schema: QuestionSchema) =>
    EffectEx.runPromise(
      DecisionModel.generate({ context: OUTAGE, schema }).pipe(
        Effect.provide(TypeSafeClient.layer({ apiKey: apiKey() })),
        Effect.flip,
      ),
    );

  test('a field with no description cannot be asked', async ({ expect }) => {
    expect(await rejects(Schema.Struct({ urgent: DecisionModel.Noul }))).toBeInstanceOf(DecisionSchemaError);
  });

  test('a field that is not a question is rejected', async ({ expect }) => {
    const schema = Schema.Struct({ summary: Schema.String.annotate({ description: 'Summarize the ticket.' }) });
    expect(await rejects(schema)).toBeInstanceOf(DecisionSchemaError);
  });
});

// The wire contract the client decodes every response through, exercised directly against the
// payload shapes the endpoint can produce.
describe('EvaluateResponse', () => {
  const decode = (body: unknown) =>
    Effect.runSyncExit(Schema.decodeUnknownEffect(DecisionModel.EvaluateResponse)(body));

  test('accepts a real response verbatim', ({ expect }) => {
    const body = {
      model: 'jev-1.13.0',
      answers: {
        urgent: { type: 'noul', noul: 0.99 },
        team: { type: 'choice', choice: 'technical', confidence: 1.0, probabilities: { technical: 1.0 } },
        frustration: {
          type: 'score',
          score: 1.66,
          confidence: 0.49,
          legend: { 0: 'Calm', 1: 'Frustrated', 2: 'Very angry' },
          probabilities: { 0: 0.0, 1: 0.34, 2: 0.66 },
        },
      },
      usage: { input_tokens: 430, output_tokens: 70 },
    };

    expect(decode(body)._tag).toBe('Success');
  });

  test('rejects an answer whose payload does not match its type', ({ expect }) => {
    expect(decode({ answers: { team: { type: 'choice', score: 1.2, confidence: 0.5 } } })._tag).toBe('Failure');
    expect(decode({ answers: { urgent: { type: 'noul' } } })._tag).toBe('Failure');
  });

  test('rejects a confidence outside [0, 1] and a body with no answers', ({ expect }) => {
    expect(decode({ answers: { team: { type: 'choice', choice: 'x', confidence: 1.4 } } })._tag).toBe('Failure');
    expect(decode({ model: 'jev-1.13.0' })._tag).toBe('Failure');
  });
});
