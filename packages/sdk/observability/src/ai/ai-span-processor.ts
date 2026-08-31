//
// Copyright 2026 DXOS.org
//

import { type Context, SpanStatusCode } from '@opentelemetry/api';
import type { BasicTracerProvider, ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-base';

/**
 * AI telemetry capture — data policy.
 *
 * This processor turns OpenTelemetry GenAI spans (`gen_ai.*` attributes, emitted by the
 * `effect/unstable/ai` provider layers) into PostHog `$ai_generation` events. It is the only place
 * the capture policy is evaluated, so every event leaving for PostHog passes through it:
 *
 * - **Metadata** — always: model, provider, request parameters, token counts, latency,
 *   trace/span/session ids, error class.
 * - **Content** — `$ai_input` / `$ai_output_choices` / `$ai_tools`, forwarded only when
 *   {@link Options.allowContent} accepts the span's space. Content is always stamped on the span
 *   upstream (`AiTelemetry` in `@dxos/ai`) and dropped here, rather than conditionally stamped, so
 *   a source that forgets the policy cannot bypass it.
 *
 * Scrub rules enforced here regardless of the above:
 * - Attribute **allowlist**: only the mappings below are forwarded; unknown span attributes are
 *   dropped (so an accidental attribute upstream cannot leak through telemetry).
 * - Errors are reduced to the exception **class name** — `exception.message` and
 *   `exception.stacktrace` recorded on the span are never forwarded, since provider error
 *   messages can embed request or response fragments.
 */

export type CaptureEvent = (event: string, properties: Record<string, unknown>) => void;

export type Options = {
  captureEvent: CaptureEvent;
  /** Whether prompt/response content may leave for the given space. Denies when the space is unknown. */
  allowContent: (spaceId: string | undefined) => boolean;
};

/** Marker attributes identifying a GenAI span (per OTel GenAI semantic conventions). */
const GEN_AI_MARKERS = ['gen_ai.system', 'gen_ai.request.model', 'gen_ai.response.model'];

/** Session/content attributes stamped by `@dxos/ai` `AiTelemetry` (not part of the GenAI spec). */
const SESSION_ID_ATTR = 'dxos.ai.session_id';
const SPACE_ID_ATTR = 'dxos.ai.space_id';
const INPUT_ATTR = 'dxos.ai.input';
const OUTPUT_ATTR = 'dxos.ai.output';
const TOOLS_ATTR = 'dxos.ai.tools';

/**
 * Forwards finished GenAI spans to PostHog as `$ai_generation` events via the injected capture
 * callback (typically `Observability.events.captureEvent`, which inherits the user's telemetry
 * opt-in/opt-out). Non-GenAI spans pass through untouched.
 */
export class AiSpanProcessor implements SpanProcessor {
  private readonly _captureEvent: CaptureEvent;
  private readonly _allowContent: Options['allowContent'];

  constructor({ captureEvent, allowContent }: Options) {
    this._captureEvent = captureEvent;
    this._allowContent = allowContent;
  }

  onStart(_span: Span, _parentContext: Context): void {}

  onEnd(span: ReadableSpan): void {
    const attributes = span.attributes;
    if (!GEN_AI_MARKERS.some((key) => attributes[key] !== undefined)) {
      return;
    }

    const spaceId = attributes[SPACE_ID_ATTR];
    const content = this._allowContent(typeof spaceId === 'string' ? spaceId : undefined);

    const spanContext = span.spanContext();
    const properties: Record<string, unknown> = {
      $ai_trace_id: spanContext.traceId,
      $ai_span_id: spanContext.spanId,
      $ai_span_name: span.name,
      $ai_parent_id: span.parentSpanContext?.spanId,
      $ai_provider: attributes['gen_ai.system'],
      $ai_model: attributes['gen_ai.response.model'] ?? attributes['gen_ai.request.model'],
      $ai_input_tokens: attributes['gen_ai.usage.input_tokens'],
      $ai_output_tokens: attributes['gen_ai.usage.output_tokens'],
      $ai_latency: hrTimeToSeconds(span.duration),
      $ai_stream: span.name === 'LanguageModel.streamText' ? true : undefined,
      $ai_session_id: attributes[SESSION_ID_ATTR],
      $ai_model_parameters: modelParameters(attributes),
      $ai_input: content ? parseJsonAttribute(attributes[INPUT_ATTR]) : undefined,
      $ai_output_choices: content ? parseJsonAttribute(attributes[OUTPUT_ATTR]) : undefined,
      $ai_tools: content ? parseJsonAttribute(attributes[TOOLS_ATTR]) : undefined,
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
 * Standalone tracer provider carrying only the AI span processor. Deliberately not registered as
 * the global OTel provider — the SigNoz exporter (extensions/otel) owns that — so AI capture and
 * infrastructure tracing cannot clobber each other's configuration or sampling.
 *
 * The tracer SDK is imported dynamically to keep it out of the eager boot graph, since this module
 * is reachable from the package barrel.
 */
export const createAiTracerProvider = async (options: Options): Promise<BasicTracerProvider> => {
  const { BasicTracerProvider } = await import('@opentelemetry/sdk-trace-base');
  return new BasicTracerProvider({ spanProcessors: [new AiSpanProcessor(options)] });
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
