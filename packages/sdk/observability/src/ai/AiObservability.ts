//
// Copyright 2026 DXOS.org
//

// Standalone entrypoint, not a barrel namespace: Composer's boot imports the root barrel, and the
// boot set is the parse graph, so hoisting the AI sink there would put it on the boot path for code
// only a lazily-activated plugin module uses. Reached at `@dxos/observability/AiObservability`.

import { type Context, SpanStatusCode } from '@opentelemetry/api';
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-base';

import { log } from '@dxos/log';

import type * as ObservabilityExtension from '../ObservabilityExtension';

/**
 * AI telemetry capture — data policy.
 *
 * The AI stack already annotates every model call with the OTel GenAI conventions (`gen_ai.*`,
 * emitted by the `effect/unstable/ai` provider layers) plus the `dxos.ai.*` attributes those
 * conventions have no room for. This reads the finished spans, applies the capture policy, and
 * hands each surviving call to a sink as a {@link ObservabilityExtension.Generation} — a shape
 * that follows the GenAI conventions, not any vendor's schema. Mapping onto a backend's own
 * vocabulary belongs to that backend's extension.
 *
 * It is the only place the policy is evaluated, so everything leaving passes through it:
 *
 * - **Nothing** unless {@link Options.captureEnabled} reports the user's telemetry opt-in as on.
 *   The gate is checked here, before a record is built, rather than left to a backend client's own
 *   opt-out flag: that flag is a separate store, so it is not the same answer as the user's
 *   DXOS-side preference.
 * - **Metadata** — model, provider, request parameters, token counts (including the prompt-cache
 *   reads and writes, which price the call and give the hit rate), latency, trace/span/session ids,
 *   error class.
 * - **Content** — prompt, response and tool names, kept only for a span that names its space and
 *   whose space {@link Options.allowContent} accepts. Content is always stamped on the span
 *   upstream (`AiTelemetry` in `@dxos/ai`) and dropped here, rather than conditionally stamped, so
 *   a source that forgets the policy cannot bypass it.
 *
 * Scrub rules enforced here regardless of the above:
 * - A span that does not name its space is treated as unknown, and unknown **denies** content. Only
 *   a call site that has declared where it runs can have its content captured, so the policy fails
 *   closed for one that has not (`AiSession` declares it; most utility model calls do not, and are
 *   reported as metadata only).
 * - Attribute **allowlist**: only the fields of `Generation` are read; every other span attribute
 *   is dropped (so an accidental attribute upstream cannot leak through telemetry).
 * - Errors are reduced to the exception **class name** — `exception.message` and
 *   `exception.stacktrace` recorded on the span are never forwarded, since provider error
 *   messages can embed request or response fragments.
 *
 * Nothing here may throw: `onEnd` runs inside `Span.end()` on the fiber that made the model call,
 * and OTel's `MultiSpanProcessor` does not catch, so an escaping error would fail that call.
 */

export type Options = {
  /** Sink for a call that survived the policy — typically `Observability.generations`. */
  captureGeneration: (generation: ObservabilityExtension.Generation) => void;
  /** Whether the user's telemetry opt-in is on. Checked before an event is built. */
  captureEnabled: () => boolean;
  /**
   * Whether prompt/response content may leave for the given space. Only called for a span that
   * names one — a span with no space never reaches this predicate and never reports content.
   */
  allowContent: (spaceId: string) => boolean;
};

/** The span `effect/unstable/ai` names for a streamed call; anything else is a single response. */
const STREAM_SPAN_NAME = 'LanguageModel.streamText';

/** Marker attributes identifying a GenAI span (per OTel GenAI semantic conventions). */
const GEN_AI_MARKERS = ['gen_ai.system', 'gen_ai.request.model', 'gen_ai.response.model'];

/**
 * Session/content attributes stamped by `AiTelemetry.ATTRIBUTES` in `@dxos/ai` (not part of the
 * GenAI spec). Restated rather than imported because telemetry sits below the AI stack, not above
 * it; the integration test in `plugin-observability` drives both halves so a rename fails there.
 */
const SESSION_ID_ATTR = 'dxos.ai.session_id';
const SPACE_ID_ATTR = 'dxos.ai.space_id';
const INPUT_ATTR = 'dxos.ai.input';
const OUTPUT_ATTR = 'dxos.ai.output';
const TOOLS_ATTR = 'dxos.ai.tools';
const TRUNCATED_ATTR = 'dxos.ai.truncated';
const CACHE_READ_TOKENS_ATTR = 'dxos.ai.cache_read_tokens';
const CACHE_WRITE_TOKENS_ATTR = 'dxos.ai.cache_write_tokens';

/**
 * Reports finished GenAI spans to the injected sink. Non-GenAI spans pass through untouched.
 *
 * Attaches to the realm's tracer provider via `Otel.addSpanProcessor` rather than owning one: the
 * process manager's baseline tracer already records every span, so a second provider would mean a
 * second sampler and a second tracer over the same spans.
 */
export class AiSpanProcessor implements SpanProcessor {
  private readonly _captureGeneration: Options['captureGeneration'];
  private readonly _captureEnabled: Options['captureEnabled'];
  private readonly _allowContent: Options['allowContent'];

  constructor({ captureGeneration, captureEnabled, allowContent }: Options) {
    this._captureGeneration = captureGeneration;
    this._captureEnabled = captureEnabled;
    this._allowContent = allowContent;
  }

  onStart(_span: Span, _parentContext: Context): void {}

  onEnd(span: ReadableSpan): void {
    try {
      this._capture(span);
    } catch (err) {
      // The caller is `Span.end()` on the model call's own fiber; failing telemetry must not fail it.
      log.catch(err, { span: span.name });
    }
  }

  private _capture(span: ReadableSpan): void {
    const attributes = span.attributes;
    if (!GEN_AI_MARKERS.some((key) => attributes[key] !== undefined)) {
      return;
    }
    if (!this._captureEnabled()) {
      return;
    }

    const spaceId = attributes[SPACE_ID_ATTR];
    const content = typeof spaceId === 'string' && this._allowContent(spaceId);

    const spanContext = span.spanContext();
    const generation: ObservabilityExtension.Generation = {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      parentSpanId: span.parentSpanContext?.spanId,
      spanName: span.name,
      provider: stringAttribute(attributes['gen_ai.system']),
      model: stringAttribute(attributes['gen_ai.response.model'] ?? attributes['gen_ai.request.model']),
      sessionId: stringAttribute(attributes[SESSION_ID_ATTR]),
      parameters: modelParameters(attributes),
      // The uncached count: add `cacheReadTokens` for what the model actually read.
      inputTokens: numberAttribute(attributes['gen_ai.usage.input_tokens']),
      outputTokens: numberAttribute(attributes['gen_ai.usage.output_tokens']),
      cacheReadTokens: numberAttribute(attributes[CACHE_READ_TOKENS_ATTR]),
      cacheWriteTokens: numberAttribute(attributes[CACHE_WRITE_TOKENS_ATTR]),
      latency: hrTimeToSeconds(span.duration),
      streaming: span.name === STREAM_SPAN_NAME,
      content: content
        ? {
            input: parseJsonAttribute(attributes[INPUT_ATTR]),
            output: parseJsonAttribute(attributes[OUTPUT_ATTR]),
            tools: parseJsonAttribute(attributes[TOOLS_ATTR]),
            // A cut value no longer parses, so it is carried as the raw fragment; saying so keeps a
            // consumer from reading a string where an array was expected as a bug.
            truncated: attributes[TRUNCATED_ATTR] === true ? true : undefined,
          }
        : undefined,
      errorClass: span.status.code === SpanStatusCode.ERROR ? errorClass(span) : undefined,
    };

    this._captureGeneration(generation);
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

const hrTimeToSeconds = ([seconds, nanos]: [number, number]): number => seconds + nanos / 1e9;

// Span attributes are `unknown` to us; narrowing is what keeps a stray value out of the record.
const stringAttribute = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const numberAttribute = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);

const modelParameters = (attributes: ReadableSpan['attributes']): Record<string, unknown> | undefined => {
  const parameters = stripUndefined({
    temperature: attributes['gen_ai.request.temperature'],
    max_tokens: attributes['gen_ai.request.max_tokens'],
    top_p: attributes['gen_ai.request.top_p'],
    top_k: attributes['gen_ai.request.top_k'],
  });
  return Object.keys(parameters).length > 0 ? parameters : undefined;
};

const parseJsonAttribute = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch {
    // Truncated content attributes are expected to no longer parse; forward the raw string.
    return value;
  }
};

/** Only the exception class name — messages and stack traces can embed prompt/response content. */
const errorClass = (span: ReadableSpan): string => {
  for (const event of span.events) {
    const type = event.attributes?.['exception.type'];
    if (typeof type === 'string') {
      return type;
    }
  }
  return 'Error';
};

export const stripUndefined = (properties: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
