//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import type * as Tracer from 'effect/Tracer';
import type * as Prompt from 'effect/unstable/ai/Prompt';
import type * as Telemetry from 'effect/unstable/ai/Telemetry';

import { log } from '@dxos/log';

/**
 * Span attributes carrying AI capture, outside the `gen_ai.*` semantic conventions.
 *
 * The names are a contract with the sink that reads them (`AiSpanProcessor` in
 * `@dxos/observability`, which cannot import this package — telemetry depends on the AI stack, not
 * the reverse — and so restates them). `AiTelemetry.test.ts` asserts the values, so a rename here
 * fails that suite rather than silently disconnecting capture.
 */
export const ATTRIBUTES = {
  /** Conversation identity, so the sink can group a conversation's turns. */
  sessionId: 'dxos.ai.session_id',
  /** Space the call runs in. The sink denies content capture when it is absent. */
  spaceId: 'dxos.ai.space_id',
  input: 'dxos.ai.input',
  output: 'dxos.ai.output',
  tools: 'dxos.ai.tools',
  /** Set when any of the above was cut to fit, so a consumer does not read a fragment as the whole. */
  truncated: 'dxos.ai.truncated',
  /**
   * Prompt-cache token counts. Not content, and carried here only because the GenAI conventions have
   * nowhere for them: `Telemetry.UsageAttributes` is input/output tokens and nothing else, so
   * `gen_ai.usage.*` cannot express a cache hit. Without them `gen_ai.usage.input_tokens` — which is
   * the *uncached* count — is the only input figure a consumer sees, and every cached turn reads as
   * a cheap one.
   */
  cacheReadTokens: 'dxos.ai.cache_read_tokens',
  cacheWriteTokens: 'dxos.ai.cache_write_tokens',
  /**
   * What a non-model span is to the sink: a {@link KIND.turn} is the unit an analytics backend
   * groups a conversation's model calls under, a {@link KIND.tool} one step inside it.
   */
  kind: 'dxos.ai.kind',
  /** Display name for a span whose OTel name is generic, e.g. the tool a `callTool` span ran. */
  name: 'dxos.ai.name',
} as const;

export const KIND = {
  turn: 'turn',
  tool: 'tool',
} as const;

export type Kind = (typeof KIND)[keyof typeof KIND];

export type SpanTransformerOptions = {
  /** Cap per serialized content attribute; a value over it is cut and the span marked truncated. */
  maxContentLength?: number;
};

/**
 * Per attribute, so a single event carries at most three times this plus metadata. Sized well under
 * the ~1 MB an ingestion request is expected to hold, since the alternative to cutting is an event
 * rejected whole — and the largest conversations are the ones worth having.
 */
const DEFAULT_MAX_CONTENT_LENGTH = 64_000;

/**
 * Serializes a content value for a span attribute, cut to `maxLength`. `undefined` when it cannot be
 * serialized at all — tool results are arbitrary values, and a cycle or a BigInt throws from
 * `JSON.stringify` — so the caller loses that one attribute rather than the call.
 */
const serializeContent = (
  key: string,
  value: () => unknown,
  maxLength: number,
): { readonly serialized: string; readonly truncated: boolean } | undefined => {
  try {
    const serialized = JSON.stringify(value());
    return { serialized: serialized.slice(0, maxLength), truncated: serialized.length > maxLength };
  } catch (err) {
    log.catch(err, { key });
    return undefined;
  }
};

/** Marks the current span as a {@link Kind}, so the sink reports it as a turn or a tool call. */
export const annotateKind = (kind: Kind): Effect.Effect<void> => Effect.annotateCurrentSpan(ATTRIBUTES.kind, kind);

/**
 * Stamps a content attribute onto the current span, serialized and cut like the model-call
 * transformer does, and reports whether it was cut. Meant for the turn and tool spans, which have
 * no transformer hook: the sink applies the same capture policy to these attributes as to a
 * model call's, so stamping here decides nothing about whether the content leaves the device.
 */
export const annotateContent = (
  key: string,
  value: () => unknown,
  options?: SpanTransformerOptions,
): Effect.Effect<boolean> =>
  Effect.suspend(() => {
    const content = serializeContent(key, value, options?.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH);
    if (content === undefined) {
      return Effect.succeed(false);
    }
    return Effect.annotateCurrentSpan(key, content.serialized).pipe(Effect.as(content.truncated));
  });

/**
 * Span transformer stamping `dxos.ai.*` attributes onto the model-call span: the prompt, the
 * response, and tool names, plus the prompt-cache token counts. Effect's `LanguageModel` invokes it
 * only when one is installed, so whether any of this is serialized at all is the installer's
 * decision, and whether it then leaves the device is the sink's.
 *
 * Cache counts ride along here rather than in their own hook because effect allows a single
 * `CurrentSpanTransformer`, and this is the only place the response — and so its usage — is offered.
 * They are metadata, and the sink forwards them whether or not it forwards content.
 */
export const makeSpanTransformer = (options?: SpanTransformerOptions): Telemetry.SpanTransformer => {
  const maxLength = options?.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH;

  // Effect calls the transformer on the model call's own fiber with no error handling, so a throw
  // here fails the call. Tool results are arbitrary values — a cycle or a BigInt throws from
  // `JSON.stringify` — so each attribute is built and stamped independently, and a failure costs
  // only its own attribute.
  const stamp = (span: Tracer.Span, key: string, value: () => unknown): boolean => {
    const content = serializeContent(key, value, maxLength);
    if (content === undefined) {
      return false;
    }
    span.attribute(key, content.serialized);
    return content.truncated;
  };

  return ({ prompt, tools, response, span }) => {
    // Cutting a serialized value leaves it unparseable, so the fragment is forwarded raw. Say so on
    // the span rather than leaving a consumer to infer it from a parse failure.
    let truncated = stamp(span, ATTRIBUTES.input, () => serializePrompt(prompt));
    truncated = stamp(span, ATTRIBUTES.output, () => serializeResponse(response)) || truncated;
    if (tools.length > 0) {
      truncated = stamp(span, ATTRIBUTES.tools, () => tools.map((tool) => ({ name: tool.name }))) || truncated;
    }
    if (truncated) {
      span.attribute(ATTRIBUTES.truncated, true);
    }
    stampCacheUsage(span, response);
  };
};

/**
 * Reads the prompt-cache counts off the response's finish part. Absent for a provider that does not
 * report them (the OpenAI-compatible adapters), in which case nothing is stamped rather than zeroes,
 * so a consumer can tell "no cache" from "no data".
 */
const stampCacheUsage = (span: Tracer.Span, response: ReadonlyArray<{ readonly type: string }>): void => {
  const finish = response.find((part) => part.type === 'finish');
  if (!finish) {
    return;
  }
  const inputTokens = (field(finish, 'usage') as { inputTokens?: Record<string, unknown> } | undefined)?.inputTokens;
  if (!inputTokens) {
    return;
  }
  if (typeof inputTokens.cacheRead === 'number') {
    span.attribute(ATTRIBUTES.cacheReadTokens, inputTokens.cacheRead);
  }
  if (typeof inputTokens.cacheWrite === 'number') {
    span.attribute(ATTRIBUTES.cacheWriteTokens, inputTokens.cacheWrite);
  }
};

// Parts are class instances across role-specific, provider-extensible unions; index access
// requires the unknown hop.
const field = (part: { readonly type: string }, key: string): unknown =>
  (part as unknown as Record<string, unknown>)[key];

/** Concatenating {@link field} directly would stringify a missing or non-string value into the capture. */
const textField = (part: { readonly type: string }, key: string): string => {
  const value = field(part, key);
  return typeof value === 'string' ? value : '';
};

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
        text += textField(part, 'text');
        break;
      case 'text-delta':
        text += textField(part, 'delta');
        break;
      case 'reasoning':
        reasoning += textField(part, 'text');
        break;
      case 'reasoning-delta':
        reasoning += textField(part, 'delta');
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
