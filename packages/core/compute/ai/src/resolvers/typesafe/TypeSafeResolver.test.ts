//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';
import * as AiError from 'effect/unstable/ai/AiError';
import * as Decision from 'effect/unstable/ai/Decision';
import * as DecisionModel from 'effect/unstable/ai/DecisionModel';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/unstable/http/HttpClientResponse';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as AiModelResolver from '../../AiModelResolver.ts';
import * as AiService from '../../AiService.ts';
import * as Model from '../../Model.ts';
import * as Provider from '../../Provider.ts';
import * as TypeSafeResolver from './TypeSafeResolver.ts';

const OUTAGE = 'Our production database is down and customers cannot check out. We need help NOW.';
const PRICING = 'Hi, whenever you have a moment — could you send me a quote for the team plan? No rush at all.';

const serviceLayer = (apiKey: string) =>
  AiModelResolver.buildAiService.pipe(
    Layer.provide(TypeSafeResolver.make({ typesafe: { apiKey: Effect.succeed(Redacted.make(apiKey)) } })),
    Layer.provide(FetchHttpClient.layer),
  );

/** Asks through `AiService`, the way an operation does. */
const decide = <
  Input extends Schema.Constraint & { readonly EncodingServices: never },
  Decisions extends Record<string, Decision.Any>,
>(
  definition: Decision.Definition<Input, Decisions>,
  input: Input['Type'],
  apiKey = process.env.TYPESAFE_API_KEY ?? '',
) =>
  DecisionModel.decide(definition, { input }).pipe(
    Effect.provide(AiService.decisionModel(Model.typesafeJev.id).pipe(Layer.provide(serviceLayer(apiKey)))),
  );

const Urgency = Decision.make({
  input: Schema.String,
  decisions: { urgent: Decision.probability({ instructions: 'Does this convey urgency?' }) },
});

const Routing = Decision.make({
  input: Schema.String,
  decisions: {
    team: Decision.classify({
      instructions: 'Which team should handle this?',
      criteria: {
        billing: 'Payments, invoicing, refunds',
        technical: 'Bugs, outages, integrations',
        sales: 'Pricing, upgrades, new accounts',
      },
    }),
  },
});

const Frustration = Decision.make({
  input: Schema.String,
  decisions: {
    frustration: Decision.rate({
      instructions: 'How frustrated is the customer?',
      criteria: ['Calm', 'Frustrated', 'Very angry'],
    }),
  },
});

// Every test here asks the real System One endpoint. The key is not available in CI, so the suite is
// tagged `manual`: run it with `DX_RUN_MANUAL_TESTS=1` and `TYPESAFE_API_KEY` set.
describe('TypeSafe against the live model', { timeout: 60_000, tags: ['manual'] }, () => {
  test('a probability tracks the state', async ({ expect }) => {
    const [outage, pricing] = await EffectEx.runPromise(
      Effect.all([decide(Urgency, OUTAGE), decide(Urgency, PRICING)], { concurrency: 2 }),
    );

    expect(outage.answers.urgent.probability).toBeGreaterThan(0.5);
    expect(pricing.answers.urgent.probability).toBeLessThan(0.5);
  });

  test('a classification routes to the right label with a full distribution', async ({ expect }) => {
    const [outage, pricing] = await EffectEx.runPromise(
      Effect.all([decide(Routing, OUTAGE), decide(Routing, PRICING)], { concurrency: 2 }),
    );

    expect(outage.answers.team.label).toBe('technical');
    expect(pricing.answers.team.label).toBe('sales');
    expect(Object.keys(outage.answers.team.probabilities).sort()).toEqual(['billing', 'sales', 'technical']);
  });

  test('a rating places the state on the declared scale', async ({ expect }) => {
    const [outage, pricing] = await EffectEx.runPromise(
      Effect.all([decide(Frustration, OUTAGE), decide(Frustration, PRICING)], { concurrency: 2 }),
    );

    expect(outage.answers.frustration.rating).toBeGreaterThan(pricing.answers.frustration.rating);
  });

  test('every decision rides one call against a structured input', async ({ expect }) => {
    const Ticket = Decision.make({
      input: Schema.Struct({ subject: Schema.String, body: Schema.String }),
      decisions: { ...Urgency.decisions, ...Routing.decisions, ...Frustration.decisions },
    });

    const { answers, usage } = await EffectEx.runPromise(
      decide(Ticket, { subject: 'Double charged for March', body: 'My card was billed twice.' }),
    );

    expect(answers.team.label).toBe('billing');
    expect(usage.inputTokens).toBeGreaterThan(0);
  });

  test('a rejected key surfaces as an authentication error', async ({ expect }) => {
    const error = await EffectEx.runPromise(decide(Urgency, OUTAGE, 'not-a-key').pipe(Effect.flip));

    expect(AiError.isAiError(error) && error.reason._tag).toBe('AuthenticationError');
  });
});

describe('TypeSafe resolver', () => {
  test('resolves only its own models', async ({ expect }) => {
    const exit = await Effect.runPromiseExit(
      Effect.void.pipe(
        Effect.provide(
          AiService.decisionModel('com.anthropic.model.claude-sonnet-5.default').pipe(Layer.provide(serviceLayer(''))),
        ),
      ),
    );

    expect(exit._tag).toBe('Failure');
  });

  test("each jev model goes to its own provider's endpoint", async ({ expect }) => {
    const urls: string[] = [];
    const recording = Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make((request) =>
        Effect.sync(() => {
          urls.push(request.url);
          return HttpClientResponse.fromWeb(
            request,
            Response.json({ model: 'jev-1.13.0', answers: { urgent: { type: 'noul', noul: 0.9 } } }),
          );
        }),
      ),
    );
    const routed = AiModelResolver.buildAiService.pipe(
      Layer.provide(
        TypeSafeResolver.make({
          typesafe: { apiKey: Effect.succeed(undefined), endpoint: () => 'http://typesafe.test/v1/systemone' },
          workersAi: { apiKey: Effect.succeed(undefined), endpoint: () => 'http://workers-ai.test/v1/systemone' },
        }),
      ),
      Layer.provide(recording),
    );
    const ask = (model: Model.Model, options?: AiService.ResolveOptions) =>
      DecisionModel.decide(Urgency, { input: OUTAGE }).pipe(
        Effect.provide(AiService.decisionModel(model.id, options).pipe(Layer.provide(routed))),
      );

    await EffectEx.runPromise(Effect.all([ask(Model.typesafeJev), ask(Model.cloudflareJev)]));
    expect(urls).toEqual(['http://typesafe.test/v1/systemone', 'http://workers-ai.test/v1/systemone']);

    // A provider that does not serve the model does not resolve it.
    const exit = await Effect.runPromiseExit(ask(Model.cloudflareJev, { provider: Provider.typesafe.id }));
    expect(exit._tag).toBe('Failure');
  });

  test('a model whose provider has no route does not resolve', async ({ expect }) => {
    const exit = await Effect.runPromiseExit(
      Effect.void.pipe(
        Effect.provide(AiService.decisionModel(Model.cloudflareJev.id).pipe(Layer.provide(serviceLayer('')))),
      ),
    );

    expect(exit._tag).toBe('Failure');
  });

  test('with no key the request carries no credential, for a proxy that authenticates upstream', async ({ expect }) => {
    const requests: HttpClientRequest.HttpClientRequest[] = [];
    const recording = Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make((request) =>
        Effect.sync(() => {
          requests.push(request);
          return HttpClientResponse.fromWeb(
            request,
            Response.json({ model: 'jev-1.13.0', answers: { urgent: { type: 'noul', noul: 0.9 } } }),
          );
        }),
      ),
    );
    const response = await EffectEx.runPromise(
      TypeSafeResolver.makeDecisionModel('jev-latest', {
        apiKey: Effect.succeed(undefined),
        endpoint: () => 'http://proxy.test/v1/systemone',
      }).pipe(
        Effect.flatMap((model) => model.decide(Urgency, { input: OUTAGE })),
        Effect.provide(recording),
      ),
    );

    expect(response.answers.urgent.probability).toBe(0.9);
    expect(requests.map((request) => request.url)).toEqual(['http://proxy.test/v1/systemone']);
    expect(requests[0].headers.authorization).toBeUndefined();
  });

  test('a stalled endpoint fails the decision instead of hanging it', async ({ expect }) => {
    const stalled = Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make(() => Effect.never),
    );
    const error = await EffectEx.runPromise(
      TypeSafeResolver.makeDecisionModel('jev-latest', {
        apiKey: Effect.succeed(Redacted.make('key')),
        timeout: '20 millis',
      }).pipe(
        Effect.flatMap((model) => model.decide(Urgency, { input: OUTAGE })),
        Effect.flip,
        Effect.provide(stalled),
      ),
    );

    expect(AiError.isAiError(error) && error.reason._tag).toBe('InternalProviderError');
  });
});

// The wire contract every response is decoded through, against the payload shapes the endpoint
// produces.
describe('EvaluateResponse', () => {
  const decode = (body: unknown) =>
    Effect.runSyncExit(Schema.decodeUnknownEffect(TypeSafeResolver.EvaluateResponse)(body));

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

// The translation between the two protocols, which is all the provider owns.
describe('answer mapping', () => {
  const team = Routing.decisions.team;
  const frustration = Frustration.decisions.frustration;

  test('each decision becomes the matching System One question', ({ expect }) => {
    expect(TypeSafeResolver.toQuestion(Urgency.decisions.urgent)).toEqual({
      type: 'noul',
      instructions: 'Does this convey urgency?',
    });
    expect(TypeSafeResolver.toQuestion(team)).toMatchObject({ type: 'choice', criteria: team.criteria });
    expect(TypeSafeResolver.toQuestion(frustration)).toMatchObject({ type: 'score', criteria: frustration.criteria });
  });

  test('a choice distribution covers every label, filling the ones System One omitted', ({ expect }) => {
    const answer = TypeSafeResolver.toProviderAnswer(team, {
      type: 'choice',
      choice: 'technical',
      confidence: 1,
      probabilities: { technical: 1 },
    });

    expect(answer).toEqual({
      _tag: 'Classify',
      label: 'technical',
      confidence: 1,
      probabilities: { billing: 0, technical: 1, sales: 0 },
    });
  });

  test('a choice with no distribution puts all the weight on the committed label', ({ expect }) => {
    const answer = TypeSafeResolver.toProviderAnswer(team, { type: 'choice', choice: 'sales', confidence: 0.7 });

    expect(answer._tag === 'Classify' && answer.probabilities).toEqual({ billing: 0, technical: 0, sales: 1 });
  });

  test('a score distribution keyed by position becomes one keyed by level, summing to 1', ({ expect }) => {
    const answer = TypeSafeResolver.toProviderAnswer(frustration, {
      type: 'score',
      score: 1.66,
      confidence: 0.49,
      // Rounded by the vendor: sums to 1.01.
      probabilities: { 0: 0.01, 1: 0.34, 2: 0.66 },
    });

    expect(answer._tag).toBe('Rate');
    const probabilities = answer._tag === 'Rate' ? answer.probabilities : {};
    expect(Object.keys(probabilities)).toEqual(['Calm', 'Frustrated', 'Very angry']);
    expect(Object.values(probabilities).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 9);
  });

  test('a mapped answer passes DecisionModel validation', async ({ expect }) => {
    const model = DecisionModel.make({
      decide: ({ decisions }) =>
        Effect.succeed({
          answers: {
            frustration: TypeSafeResolver.toProviderAnswer(decisions.frustration, {
              type: 'score',
              score: 1.66,
              confidence: 0.49,
              probabilities: { 0: 0.01, 1: 0.34, 2: 0.66 },
            }),
          },
          usage: { inputTokens: undefined, outputTokens: undefined },
        }),
    });

    const { answers } = await EffectEx.runPromise(
      Effect.flatMap(model, (service) => service.decide(Frustration, { input: OUTAGE })),
    );

    expect(answers.frustration.label).toBe('Very angry');
  });
});
