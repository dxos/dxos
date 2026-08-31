//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import * as Tracer from 'effect/Tracer';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import type * as Prompt from 'effect/unstable/ai/Prompt';
import * as Telemetry from 'effect/unstable/ai/Telemetry';

import type * as AiService from './AiService';

export type WrapOptions = {
  /** Tracer receiving the model-call spans; when omitted the ambient tracer is left in place. */
  tracer?: Tracer.Tracer;
  /** Content span transformer (tier 2) — omit to capture metadata only. */
  spanTransformer?: Telemetry.SpanTransformer;
};

/**
 * Wraps an {@link AiService.Service} so every resolved model runs with the given tracer (routing
 * the `gen_ai.*` spans the effect-ai layers already emit) and optional content transformer.
 * Providing `spanTransformer` IS the content-capture (tier 2) decision — see the policy in
 * `@dxos/observability` `AiSpanProcessor`.
 */
export const wrap = (service: AiService.Service, options: WrapOptions): AiService.Service => ({
  ...service,
  model: (model, resolveOptions) =>
    Layer.effect(
      LanguageModel.LanguageModel,
      Effect.map(LanguageModel.LanguageModel, (languageModel) => wrapLanguageModel(languageModel, options)),
    ).pipe(Layer.provide(service.model(model, resolveOptions))),
});

const wrapLanguageModel = (
  languageModel: LanguageModel.Service,
  { tracer, spanTransformer }: WrapOptions,
): LanguageModel.Service => ({
  generateText: wrapMethod(languageModel.generateText, (effect) => provide(effect, tracer, spanTransformer)),
  generateObject: wrapMethod(languageModel.generateObject, (effect) => provide(effect, tracer, spanTransformer)),
  streamText: wrapMethod(languageModel.streamText, (stream) => provideStream(stream, tracer, spanTransformer)),
});

// Delegating through a wrapper erases overload signatures; the cast restores them unchanged.
const wrapMethod = <F extends (...args: never[]) => unknown>(method: F, decorate: (result: any) => unknown): F =>
  ((...args: never[]) => decorate(method(...args))) as F;

const provide = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  tracer?: Tracer.Tracer,
  spanTransformer?: Telemetry.SpanTransformer,
): Effect.Effect<A, E, R> => {
  let result = effect;
  if (tracer) {
    result = Effect.provideService(result, Tracer.Tracer, tracer);
  }
  if (spanTransformer) {
    result = Effect.provideService(result, Telemetry.CurrentSpanTransformer, spanTransformer);
  }
  return result;
};

const provideStream = <A, E, R>(
  stream: Stream.Stream<A, E, R>,
  tracer?: Tracer.Tracer,
  spanTransformer?: Telemetry.SpanTransformer,
): Stream.Stream<A, E, R> => {
  let result = stream;
  if (tracer) {
    result = Stream.provideService(result, Tracer.Tracer, tracer);
  }
  if (spanTransformer) {
    result = Stream.provideService(result, Telemetry.CurrentSpanTransformer, spanTransformer);
  }
  return result;
};

export type ContentTransformerOptions = {
  /** Cap per serialized content attribute; oversized values are cut mid-JSON and forwarded raw. */
  maxContentLength?: number;
};

const DEFAULT_MAX_CONTENT_LENGTH = 200_000;

/**
 * Span transformer stamping prompt, response, and tool names onto the model-call span as
 * `dxos.ai.*` attributes.
 */
export const makeContentSpanTransformer = (options?: ContentTransformerOptions): Telemetry.SpanTransformer => {
  const maxLength = options?.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH;
  const truncate = (value: string): string => (value.length > maxLength ? value.slice(0, maxLength) : value);

  return ({ prompt, tools, response, span }) => {
    span.attribute('dxos.ai.input', truncate(JSON.stringify(serializePrompt(prompt))));
    span.attribute('dxos.ai.output', truncate(JSON.stringify(serializeResponse(response))));
    if (tools.length > 0) {
      span.attribute('dxos.ai.tools', truncate(JSON.stringify(tools.map((tool) => ({ name: tool.name })))));
    }
  };
};

// Parts are class instances across role-specific, provider-extensible unions; index access
// requires the unknown hop.
const field = (part: { readonly type: string }, key: string): unknown =>
  (part as unknown as Record<string, unknown>)[key];

const serializePrompt = (prompt: Prompt.Prompt): unknown[] =>
  prompt.content.map((message) => ({
    role: message.role,
    content: typeof message.content === 'string' ? message.content : message.content.map(serializePart),
  }));

const serializePart = (part: { readonly type: string }): unknown => {
  switch (part.type) {
    case 'text':
    case 'reasoning':
      return { type: part.type, text: field(part, 'text') };
    case 'tool-call':
      return { type: 'function', function: { name: field(part, 'name'), arguments: field(part, 'params') } };
    case 'tool-result':
      return { type: 'tool-result', name: field(part, 'name'), result: field(part, 'result') };
    default:
      // Binary and provider-specific parts are elided by type name rather than serialized.
      return { type: part.type };
  }
};

/** Collapses response parts (final or streamed) into a single assistant choice. */
const serializeResponse = (response: ReadonlyArray<{ readonly type: string }>): unknown[] => {
  let text = '';
  let reasoning = '';
  const content: unknown[] = [];
  for (const part of response) {
    switch (part.type) {
      case 'text':
        text += field(part, 'text');
        break;
      case 'text-delta':
        text += field(part, 'delta');
        break;
      case 'reasoning':
        reasoning += field(part, 'text');
        break;
      case 'reasoning-delta':
        reasoning += field(part, 'delta');
        break;
      case 'tool-call':
        content.push({ type: 'function', function: { name: field(part, 'name'), arguments: field(part, 'params') } });
        break;
    }
  }
  if (reasoning.length > 0) {
    content.unshift({ type: 'reasoning', text: reasoning });
  }
  if (text.length > 0) {
    content.unshift({ type: 'text', text });
  }
  return [{ role: 'assistant', content }];
};
