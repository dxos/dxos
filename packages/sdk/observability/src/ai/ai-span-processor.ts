//
// Copyright 2026 DXOS.org
//

import { type Context, SpanStatusCode } from '@opentelemetry/api';
import type { BasicTracerProvider, ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-base';

import { log } from '@dxos/log';

/**
 * AI telemetry capture — data policy.
 *
 * This processor turns OpenTelemetry GenAI spans (`gen_ai.*` attributes, emitted by the
 * `effect/unstable/ai` provider layers) into PostHog `$ai_generation` events. It is the only place
 * the capture policy is evaluated, so every event leaving for PostHog passes through it:
 *
 * - **Nothing** unless {@link Options.captureEnabled} reports the user's telemetry opt-in as on.
 *   The gate is checked here, before an event is built, rather than left to the PostHog client's
 *   own opt-out flag: that flag lives in a separate store keyed by API token, so it is not the
 *   same answer as the user's DXOS-side preference.
 * - **Metadata** — model, provider, request parameters, token counts (including the prompt-cache
 *   reads and writes, which price the call and give the hit rate), latency, trace/span/session ids,
 *   error class.
 * - **Content** — `$ai_input` / `$ai_output_choices` / `$ai_tools`, forwarded only for a span that
 *   names its space and whose space {@link Options.allowContent} accepts. Content is always stamped
 *   on the span upstream (`AiTelemetry` in `@dxos/ai`) and dropped here, rather than conditionally
 *   stamped, so a source that forgets the policy cannot bypass it.
 *
 * Scrub rules enforced here regardless of the above:
 * - A span that does not name its space is treated as unknown, and unknown **denies** content. Only
 *   a call site that has declared where it runs can have its content captured, so the policy fails
 *   closed for one that has not (`AiSession` declares it; most utility model calls do not, and are
 *   reported as metadata only).
 * - Attribute **allowlist**: only the mappings below are forwarded; unknown span attributes are
 *   dropped (so an accidental attribute upstream cannot leak through telemetry).
 * - Errors are reduced to the exception **class name** — `exception.message` and
 *   `exception.stacktrace` recorded on the span are never forwarded, since provider error
 *   messages can embed request or response fragments.
 *
 * Nothing here may throw: `onEnd` runs inside `Span.end()` on the fiber that made the model call,
 * and OTel's `MultiSpanProcessor` does not catch, so an escaping error would fail that call.
 */

export type CaptureEvent = (event: string, properties: Record<string, unknown>) => void;

export type Options = {
  captureEvent: CaptureEvent;
  /** Whether the user's telemetry opt-in is on. Checked before an event is built. */
  captureEnabled: () => boolean;
  /**
   * Whether prompt/response content may leave for the given space. Only called for a span that
   * names one — a span with no space never reaches this predicate and never reports content.
   */
  allowContent: (spaceId: string) => boolean;
};

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
 * Forwards finished GenAI spans to PostHog as `$ai_generation` events via the injected capture
 * callback (typically `Observability.events.captureEvent`). Non-GenAI spans pass through untouched.
 */
export class AiSpanProcessor implements SpanProcessor {
  private readonly _captureEvent: CaptureEvent;
  private readonly _captureEnabled: Options['captureEnabled'];
  private readonly _allowContent: Options['allowContent'];

  constructor({ captureEvent, captureEnabled, allowContent }: Options) {
    this._captureEvent = captureEvent;
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
    const properties: Record<string, unknown> = {
      $ai_trace_id: spanContext.traceId,
      $ai_span_id: spanContext.spanId,
      $ai_span_name: span.name,
      $ai_parent_id: span.parentSpanContext?.spanId,
      $ai_provider: attributes['gen_ai.system'],
      $ai_model: attributes['gen_ai.response.model'] ?? attributes['gen_ai.request.model'],
      // `gen_ai.usage.input_tokens` is the uncached count, which is what PostHog expects alongside
      // the two cache figures — together they price the call, and their ratio is the hit rate.
      $ai_input_tokens: attributes['gen_ai.usage.input_tokens'],
      $ai_output_tokens: attributes['gen_ai.usage.output_tokens'],
      $ai_cache_read_input_tokens: attributes[CACHE_READ_TOKENS_ATTR],
      $ai_cache_creation_input_tokens: attributes[CACHE_WRITE_TOKENS_ATTR],
      $ai_latency: hrTimeToSeconds(span.duration),
      $ai_stream: span.name === `${MODEL_CALL_SPAN_PREFIX}streamText` ? true : undefined,
      $ai_session_id: attributes[SESSION_ID_ATTR],
      $ai_model_parameters: modelParameters(attributes),
      $ai_input: content ? parseJsonAttribute(attributes[INPUT_ATTR]) : undefined,
      $ai_output_choices: content ? parseJsonAttribute(attributes[OUTPUT_ATTR]) : undefined,
      $ai_tools: content ? parseJsonAttribute(attributes[TOOLS_ATTR]) : undefined,
      // A cut value is no longer parseable, so it is forwarded as the raw fragment; this says which
      // events those are rather than leaving a string where an array was expected to look like a bug.
      $ai_content_truncated: content && attributes[TRUNCATED_ATTR] === true ? true : undefined,
    };

    if (span.status.code === SpanStatusCode.ERROR) {
      properties.$ai_is_error = true;
      properties.$ai_error = errorClass(span);
    }

    this._captureEvent('$ai_generation', stripUndefined(properties));
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Prefix of the span names `effect/unstable/ai` gives model calls. Sampling on it is what keeps
 * this provider cheap: it backs an app-wide `Tracer`, so without it every span the app emits — a
 * hundred-odd `withSpan` sites plus every operation — would be allocated and attributed in full
 * just to be discarded by the marker check in `onEnd`.
 */
const MODEL_CALL_SPAN_PREFIX = 'LanguageModel.';

/**
 * Standalone tracer provider carrying only the AI span processor. Deliberately not registered as
 * the global OTel provider — the SigNoz exporter (extensions/otel) owns that — so AI capture and
 * infrastructure tracing cannot clobber each other's configuration or sampling.
 *
 * Only model-call spans are recorded. Their `dxos.ai.*` annotations survive an unrecorded parent,
 * because Effect carries span annotations on the fiber and stamps them onto each span as it is
 * created rather than inheriting them through the parent span.
 *
 * The tracer SDK is imported dynamically to keep it out of the eager boot graph, since this module
 * is reachable from the package barrel.
 */
export const createAiTracerProvider = async (options: Options): Promise<BasicTracerProvider> => {
  const { BasicTracerProvider, SamplingDecision } = await import('@opentelemetry/sdk-trace-base');
  return new BasicTracerProvider({
    sampler: {
      shouldSample: (_context, _traceId, spanName) => ({
        decision: spanName.startsWith(MODEL_CALL_SPAN_PREFIX)
          ? SamplingDecision.RECORD_AND_SAMPLED
          : SamplingDecision.NOT_RECORD,
      }),
      toString: () => 'AiSpanSampler',
    },
    spanProcessors: [new AiSpanProcessor(options)],
  });
};

const hrTimeToSeconds = ([seconds, nanos]: [number, number]): number => seconds + nanos / 1e9;

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

const stripUndefined = (properties: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
