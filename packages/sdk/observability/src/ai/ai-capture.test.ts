//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import * as Tracer from 'effect/Tracer';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import * as Telemetry from 'effect/unstable/ai/Telemetry';

import { AiTelemetry } from '@dxos/ai';
import { makeTracer } from '@dxos/effect';

import type * as ObservabilityExtension from '../observability-extension';
import * as AiObservability from './AiObservability';

/**
 * Drives the whole path — transformer, span, processor, generation — across the seam its two halves
 * meet at.
 *
 * They cannot import each other in production: telemetry sits below the AI stack, so the sink
 * restates the `dxos.ai.*` names rather than importing them, and each half is otherwise tested
 * against its own copy of them. `@dxos/ai` is a devDependency here for exactly that reason — it
 * makes a rename on either side fail something.
 */
describe('AI observability wiring', () => {
  it.effect('reports a model call with its content', () =>
    Effect.gen(function* () {
      const { events, flush, callModel } = yield* setup();
      yield* callModel;
      yield* flush;

      expect(events).toHaveLength(1);
      const [generation] = events;
      expect(generation.content?.input).toEqual([{ role: 'user', content: [{ type: 'text', text: 'hi' }] }]);
      expect(generation.content?.output).toEqual([{ role: 'assistant', content: [{ type: 'text', text: 'hello' }] }]);
    }),
  );

  it.effect('reports metadata only when the policy rejects the space', () =>
    Effect.gen(function* () {
      const { events, flush, callModel } = yield* setup({ allowContent: () => false });
      yield* callModel;
      yield* flush;

      expect(events[0]?.content).toBeUndefined();
      expect(events[0]?.model).toEqual('test-model');
      // Cache counts are metadata: they price the call and survive the content policy.
      expect(events[0]?.cacheReadTokens).toEqual(11);
      expect(JSON.stringify(events[0])).not.toContain('hello');
    }),
  );

  it.effect('reports metadata only when the call site never named a space', () =>
    Effect.gen(function* () {
      const { events, flush, callModel } = yield* setup({ declaresSpace: false });
      yield* callModel;
      yield* flush;

      expect(events[0]?.content).toBeUndefined();
      expect(events[0]?.model).toEqual('test-model');
    }),
  );

  it.effect('reports only the model call, not the spans around it', () =>
    Effect.gen(function* () {
      const { events, flush, callModel } = yield* setup();
      yield* callModel;
      yield* flush;

      expect(events.map(({ spanName }) => spanName)).toEqual(['LanguageModel.generateText']);
    }),
  );

  it.effect('reports nothing while telemetry is off', () =>
    Effect.gen(function* () {
      const { events, flush, callModel } = yield* setup({ captureEnabled: () => false });
      yield* callModel;
      yield* flush;

      expect(events).toHaveLength(0);
    }),
  );
});

type Captured = ObservabilityExtension.Generation;

const stubModel = LanguageModel.make({
  generateText: ({ span }) =>
    Effect.sync(() => {
      Telemetry.addGenAIAnnotations(span, { system: 'anthropic', request: { model: 'test-model' } });
      return [
        { type: 'text' as const, text: 'hello' },
        {
          type: 'finish' as const,
          reason: 'stop' as const,
          usage: {
            inputTokens: { uncached: 3, total: 21, cacheRead: 11, cacheWrite: 7 },
            outputTokens: { total: 5 },
          },
        },
      ];
    }),
  streamText: () => Stream.empty,
});

const SPACE_ID = 'plaintext-space';

/** Mirrors what `ai-observability.ts` installs into the process-manager runtime. */
const setup = ({
  allowContent = () => true,
  captureEnabled = () => true,
  declaresSpace = true,
}: {
  allowContent?: (spaceId: string) => boolean;
  captureEnabled?: () => boolean;
  declaresSpace?: boolean;
} = {}) =>
  Effect.gen(function* () {
    const events: Captured[] = [];
    // Mirrors the app: one provider for the realm, with the AI processor attached alongside
    // whatever else observes spans.
    const { BasicTracerProvider } = yield* Effect.promise(() => import('@opentelemetry/sdk-trace-base'));
    const provider = new BasicTracerProvider({
      spanProcessors: [
        new AiObservability.AiSpanProcessor({
          captureGeneration: (generation) => events.push(generation),
          captureTurn: () => {},
          captureToolCall: () => {},
          captureEnabled,
          allowContent,
        }),
      ],
    });

    const layer = Layer.mergeAll(
      Layer.effect(LanguageModel.LanguageModel, stubModel),
      Layer.succeed(Tracer.Tracer, makeTracer(provider, 'test')),
      // Installed explicitly here; `AiModelResolver.test.ts` covers that a resolved model brings it.
      Layer.succeed(Telemetry.CurrentSpanTransformer, AiTelemetry.makeSpanTransformer()),
    );

    // How `AiSession` declares its space: an annotation on the enclosing effect, inherited by the
    // model-call span beneath it.
    const annotations = declaresSpace ? { [AiTelemetry.ATTRIBUTES.spaceId]: SPACE_ID } : {};
    const callModel = LanguageModel.generateText({ prompt: 'hi' }).pipe(
      // The enclosing span stands in for `AiSession.createRequest`: it is recorded like any other
      // span now, and the processor ignores it for want of `gen_ai.*` markers.
      Effect.withSpan('AiSession.createRequest'),
      Effect.annotateSpans(annotations),
      Effect.provide(layer),
    );

    return { events, callModel, flush: Effect.promise(() => provider.forceFlush()) };
  });
