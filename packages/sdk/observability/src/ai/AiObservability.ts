//
// Copyright 2026 DXOS.org
//

// Standalone entrypoint, not a barrel namespace: Composer's boot imports the root barrel, and the
// boot set is the parse graph, so hoisting the AI sink there would put it on the boot path for code
// only a lazily-activated plugin module uses. Reached at `@dxos/observability/AiObservability`.

import { type Context, SpanStatusCode } from '@opentelemetry/api';
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-base';

import { SpanAttributes } from '@dxos/effect';
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
 *   a call that runs in a known space can have its content captured, so the policy fails closed
 *   for one that does not (`AiSession` names it, and a process scoped to a space stamps it on every
 *   span it runs; a utility model call outside both is reported as metadata only).
 * - Attribute **allowlist**: only the fields of `Generation` are read; every other span attribute
 *   is dropped (so an accidental attribute upstream cannot leak through telemetry).
 * - Errors are reduced to the exception **class name** — `exception.message` and
 *   `exception.stacktrace` recorded on the span are never forwarded, since provider error
 *   messages can embed request or response fragments.
 *
 * Nothing here may throw: `onEnd` runs inside `Span.end()` on the fiber that made the model call,
 * and OTel's `MultiSpanProcessor` does not catch, so an escaping error would fail that call.
 */

/**
 * AI telemetry capture policy:
 *
 * | Observability toggle | Space                                 | Capture          |
 * |----------------------|---------------------------------------|------------------|
 * | off                  | any                                   | nothing          |
 * | on                   | EDGE has plaintext access (all today) | metadata+content |
 * | on                   | E2E-encrypted (future)                | metadata only    |
 * | on                   | not declared by the call site         | metadata only    |
 *
 * Metadata is model, provider, tokens, latency, and trace/session ids. Content adds the prompt,
 * the response, and tool names — including tool results, i.e. data the agent read from the space.
 * The rationale: content that already leaves the device in plaintext for EDGE to replicate is not
 * newly exposed in kind by telemetry, whereas an E2E space promises that plaintext never reaches
 * infrastructure, and telemetry must not become the side channel that breaks it.
 *
 * The last row is the fail-closed default. A space id reaches the span only from a call site that
 * declares one (`AiSession` does; the utility model calls behind summarization, tagging, and
 * extraction do not), so content capture is opt-in per call site and an undeclared one reports
 * metadata only. That is what keeps this predicate honest once it stops returning true: it can
 * never be asked about a space nobody named.
 *
 * Both this predicate and the telemetry opt-in are evaluated in the sink, not at the model call, so
 * they apply to every event on the way out (see `AiSpanProcessor` in `@dxos/observability`, which
 * also holds the scrub rules).
 */
export const contentCaptureAllowed = (_spaceId: string): boolean => {
  // Always true today because every space replicates through EDGE in plaintext. This MUST NOT
  // stay unconditional: once E2E-encrypted spaces exist this predicate has to return false for
  // them — and apply at the data boundary, not just the conversation's home space, since a turn
  // that reads from an E2E space via a cross-space reference would otherwise leak its content.
  return true;
};

export type Options = {
  /** Sink for a call that survived the policy — typically `Observability.generations`. */
  captureGeneration: (generation: ObservabilityExtension.Generation) => void;
  /** Sink for a conversation turn (`dxos.ai.kind = turn`), the unit its model calls group under. */
  captureTurn: (turn: ObservabilityExtension.Turn) => void;
  /** Sink for a tool call inside a turn (`dxos.ai.kind = tool`). */
  captureToolCall: (toolCall: ObservabilityExtension.ToolCall) => void;
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
 * it; the `wired to @dxos/ai` cases in `AiObservability.test.ts` drive both halves so a rename fails there.
 */
const SESSION_ID_ATTR = SpanAttributes.AI.sessionId;
/**
 * Shared with the process handle and ECHO rather than AI-specific: a model call inside a
 * space-scoped process carries it whether or not the call site named its space itself.
 */
const SPACE_ID_ATTR = SpanAttributes.SPACE_ID;
const INPUT_ATTR = SpanAttributes.AI.input;
const OUTPUT_ATTR = SpanAttributes.AI.output;
const TOOLS_ATTR = SpanAttributes.AI.tools;
const TRUNCATED_ATTR = SpanAttributes.AI.truncated;
const CACHE_READ_TOKENS_ATTR = SpanAttributes.AI.cacheReadTokens;
const CACHE_WRITE_TOKENS_ATTR = SpanAttributes.AI.cacheWriteTokens;
/** What a non-model span is (`AiTelemetry.KIND`); a span with neither value is not AI at all. */
const KIND_ATTR = SpanAttributes.AI.kind;
const KIND_TURN = SpanAttributes.AI_KIND.turn;
const KIND_TOOL = SpanAttributes.AI_KIND.tool;
/** Display name for a span whose OTel name is generic, e.g. the tool a `callTool` span ran. */
const NAME_ATTR = SpanAttributes.AI.name;

/**
 * Reports finished AI spans to the injected sinks: model calls (`gen_ai.*`) as generations, and the
 * turn and tool-call spans the AI stack marks with `dxos.ai.kind`. Every other span passes through
 * untouched.
 *
 * Attaches to the realm's tracer provider via `Otel.addSpanProcessor` rather than owning one: the
 * process manager's baseline tracer already records every span, so a second provider would mean a
 * second sampler and a second tracer over the same spans.
 */
export class AiSpanProcessor implements SpanProcessor {
  private readonly _captureGeneration: Options['captureGeneration'];
  private readonly _captureTurn: Options['captureTurn'];
  private readonly _captureToolCall: Options['captureToolCall'];
  private readonly _captureEnabled: Options['captureEnabled'];
  private readonly _allowContent: Options['allowContent'];

  constructor({ captureGeneration, captureTurn, captureToolCall, captureEnabled, allowContent }: Options) {
    this._captureGeneration = captureGeneration;
    this._captureTurn = captureTurn;
    this._captureToolCall = captureToolCall;
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
    const kind = attributes[KIND_ATTR];
    const isModelCall = GEN_AI_MARKERS.some((key) => attributes[key] !== undefined);
    if (kind !== KIND_TURN && kind !== KIND_TOOL && !isModelCall) {
      return;
    }
    if (!this._captureEnabled()) {
      return;
    }

    const spaceId = attributes[SPACE_ID_ATTR];
    const content = typeof spaceId === 'string' && this._allowContent(spaceId);

    if (kind === KIND_TURN || kind === KIND_TOOL) {
      const spanContext = span.spanContext();
      const record: ObservabilityExtension.AiSpanBase = {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        parentSpanId: span.parentSpanContext?.spanId,
        spanName: stringAttribute(attributes[NAME_ATTR]) ?? span.name,
        sessionId: stringAttribute(attributes[SESSION_ID_ATTR]),
        latency: hrTimeToSeconds(span.duration),
        content: content
          ? {
              input: parseJsonOrRaw(attributes[INPUT_ATTR]),
              output: parseJsonOrRaw(attributes[OUTPUT_ATTR]),
              truncated: attributes[TRUNCATED_ATTR] === true ? true : undefined,
            }
          : undefined,
        errorClass: span.status.code === SpanStatusCode.ERROR ? errorClass(span) : undefined,
      };
      if (kind === KIND_TURN) {
        this._captureTurn(record);
      } else {
        this._captureToolCall(record);
      }
      return;
    }

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
            input: parseJsonOrRaw(attributes[INPUT_ATTR]),
            output: parseJsonOrRaw(attributes[OUTPUT_ATTR]),
            tools: parseJsonOrRaw(attributes[TOOLS_ATTR]),
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

const parseJsonOrRaw = (value: unknown): unknown => {
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
