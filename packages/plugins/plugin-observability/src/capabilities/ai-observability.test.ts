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
import * as AiObservability from '@dxos/observability/AiObservability';

/**
 * Producer and sink live in packages that cannot import each other — telemetry sits below the AI
 * stack — so each is otherwise tested against its own copy of the `dxos.ai.*` names. This drives
 * the whole path (transformer → span → processor → captured event) in the one package that depends
 * on both, which is what makes a rename on either side fail.
 */
describe('AI observability wiring', () => {
  it.effect('reports a model call with its content', () =>
    Effect.gen(function* () {
      const { events, flush, callModel } = yield* setup();
      yield* callModel;
      yield* flush;

      expect(events).toHaveLength(1);
      const [{ event, properties }] = events;
      expect(event).toEqual('$ai_generation');
      expect(properties.$ai_space_id).toBeUndefined(); // Not forwarded; it only decides the policy.
      expect(properties.$ai_input).toEqual([{ role: 'user', content: [{ type: 'text', text: 'hi' }] }]);
      expect(properties.$ai_output_choices).toEqual([
        { role: 'assistant', content: [{ type: 'text', text: 'hello' }] },
      ]);
    }),
  );

  it.effect('reports metadata only when the policy rejects the space', () =>
    Effect.gen(function* () {
      const { events, flush, callModel } = yield* setup({ allowContent: () => false });
      yield* callModel;
      yield* flush;

      expect(events[0]?.properties.$ai_input).toBeUndefined();
      expect(events[0]?.properties.$ai_output_choices).toBeUndefined();
      expect(events[0]?.properties.$ai_model).toEqual('test-model');
      // Cache counts are metadata: they price the call and survive the content policy.
      expect(events[0]?.properties.$ai_cache_read_input_tokens).toEqual(11);
      expect(JSON.stringify(events[0]?.properties)).not.toContain('hello');
    }),
  );

  it.effect('reports metadata only when the call site never named a space', () =>
    Effect.gen(function* () {
      const { events, flush, callModel } = yield* setup({ declaresSpace: false });
      yield* callModel;
      yield* flush;

      expect(events[0]?.properties.$ai_input).toBeUndefined();
      expect(events[0]?.properties.$ai_model).toEqual('test-model');
    }),
  );

  it.effect('records only the model call, not the spans around it', () =>
    Effect.gen(function* () {
      const { events, flush, callModel } = yield* setup();
      yield* callModel;
      yield* flush;

      expect(events.map(({ properties }) => properties.$ai_span_name)).toEqual(['LanguageModel.generateText']);
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

type Captured = { event: string; properties: Record<string, unknown> };

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
    const provider = yield* Effect.promise(() =>
      AiObservability.createAiTracerProvider({
        captureEvent: (event, properties) => events.push({ event, properties }),
        captureEnabled,
        allowContent,
      }),
    );

    const layer = Layer.mergeAll(
      Layer.effect(LanguageModel.LanguageModel, stubModel),
      Layer.succeed(Tracer.Tracer, makeTracer(provider, 'test')),
      Layer.succeed(Telemetry.CurrentSpanTransformer, AiTelemetry.makeSpanTransformer()),
    );

    // How `AiSession` declares its space: an annotation on the enclosing effect, inherited by the
    // model-call span beneath it.
    const annotations = declaresSpace ? { [AiTelemetry.ATTRIBUTES.spaceId]: SPACE_ID } : {};
    const callModel = LanguageModel.generateText({ prompt: 'hi' }).pipe(
      // The enclosing span stands in for `AiSession.createRequest`. The provider samples it away —
      // only model calls are recorded — so reaching the policy at all proves the annotation travels
      // on the fiber rather than through the parent span.
      Effect.withSpan('AiSession.createRequest'),
      Effect.annotateSpans(annotations),
      Effect.provide(layer),
    );

    return { events, callModel, flush: Effect.promise(() => provider.forceFlush()) };
  });
