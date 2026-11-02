//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as HttpClient from 'effect/http/HttpClient';
import * as HttpClientResponse from 'effect/http/HttpClientResponse';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import * as AiModelResolver from '../../AiModelResolver.ts';
import * as AiService from '../../AiService.ts';
import * as ExtractionModel from '../../ExtractionModel.ts';
import * as Model from '../../Model.ts';
import * as ClairicResolver from './ClairicResolver.ts';

const ENDPOINT = 'http://clairic.test/v1/extract';

/** The response the Clairic docs show for their invoice example, trimmed to the fields asked below. */
const RESPONSE = {
  model: 'clairic',
  answers: {
    invoice_number: {
      type: 'text',
      p_null: 3.8e-10,
      span: [8, 16],
      guess: 'INV-2291',
      confidence: 1,
      value: 'INV-2291',
    },
    total: { type: 'number', p_null: 2.3e-8, guess: 1080, confidence: 0.9999, value: 1080 },
    contacts: { type: 'list', value: ['Dana Ruiz', 'Priya Shah'], spans: [[120, 129]], confidence: 0.9999 },
    po_number: { type: 'text', p_null: 1, guess: 'INV-2291', confidence: 0.9995, value: null },
    days_to_pay: { type: 'estimate', value: 30, mean: 29.5, median: 30, p10: 21, p90: 38 },
  },
  truncated: false,
  usage: { input_tokens: 655, output_tokens: 0 },
};

const FIELDS = {
  invoice_number: { type: 'text' },
  total: { type: 'number', decimals: 2, unit: 'USD', nullThreshold: 0.4 },
  contacts: { type: 'list', items: 'text' },
  po_number: { type: 'text', instructions: 'Purchase order number' },
  days_to_pay: { type: 'estimate', min: 0, max: 120, step: 1 },
  unanswered: { type: 'date' },
} as const;

/** Answers every request with `body`, recording what was sent. */
const fakeClient = (body: unknown) => {
  const requests: unknown[] = [];
  const client = HttpClient.make((request) =>
    Effect.sync(() => {
      requests.push(request.body._tag === 'Uint8Array' ? JSON.parse(new TextDecoder().decode(request.body.body)) : {});
      return HttpClientResponse.fromWeb(request, Response.json(body));
    }),
  );
  return { requests, layer: Layer.succeed(HttpClient.HttpClient, client) };
};

const extract = (body: unknown) => {
  const { requests, layer } = fakeClient(body);
  const service = AiModelResolver.buildAiService.pipe(
    Layer.provide(ClairicResolver.make({ apiKey: Effect.succeed(undefined), endpoint: () => ENDPOINT })),
    Layer.provide(layer),
  );
  const run = ExtractionModel.extract(FIELDS, { state: 'Invoice INV-2291', referenceDate: '2026-10-27' }).pipe(
    Effect.provide(AiService.extractionModel(Model.cloudflareClairic.id).pipe(Layer.provide(service))),
  );
  return { requests, run };
};

describe('ClairicResolver', () => {
  test('sends the fields on the Clairic wire and types the answers', async ({ expect }) => {
    const { requests, run } = extract(RESPONSE);
    const { answers, usage } = await EffectEx.runPromise(run);

    expect(requests[0]).toMatchObject({
      model: 'clairic',
      state: 'Invoice INV-2291',
      reference_date: '2026-10-27',
      fields: { total: { type: 'number', decimals: 2, unit: 'USD', null_threshold: 0.4 } },
    });
    expect(answers.invoice_number).toMatchObject({ value: 'INV-2291', confidence: 1 });
    expect(answers.total.value).toBe(1080);
    expect(answers.contacts.value).toEqual(['Dana Ruiz', 'Priya Shah']);
    expect(answers.po_number).toMatchObject({ value: null, pNull: 1 });
    expect(answers.days_to_pay.estimate).toEqual({ median: 30, mean: 29.5, p10: 21, p90: 38 });
    // A field the provider did not answer reads as null rather than missing.
    expect(answers.unanswered.value).toBeNull();
    expect(usage).toEqual({ inputTokens: 655, outputTokens: 0 });
  });

  test('a value of the wrong type reads as null', async ({ expect }) => {
    const { run } = extract({ ...RESPONSE, answers: { total: { type: 'number', value: 'lots' } } });
    const { answers } = await EffectEx.runPromise(run);
    expect(answers.total.value).toBeNull();
  });

  test('a malformed body fails the extraction', async ({ expect }) => {
    const { run } = extract({ nope: true });
    const exit = await EffectEx.runPromise(Effect.exit(run));
    expect(exit._tag).toBe('Failure');
  });

  test('a model it does not serve is not available', async ({ expect }) => {
    const { layer } = fakeClient(RESPONSE);
    const service = AiModelResolver.buildAiService.pipe(
      Layer.provide(ClairicResolver.make({ apiKey: Effect.succeed(undefined), endpoint: () => ENDPOINT })),
      Layer.provide(layer),
    );
    const exit = await EffectEx.runPromise(
      Effect.exit(
        ExtractionModel.extract(FIELDS, { state: '' }).pipe(
          Effect.provide(AiService.extractionModel(Model.cloudflareClef.id).pipe(Layer.provide(service))),
        ),
      ),
    );
    expect(exit._tag).toBe('Failure');
  });
});
