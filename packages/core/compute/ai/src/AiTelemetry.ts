//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import type * as Tracer from 'effect/Tracer';
import type * as Prompt from 'effect/unstable/ai/Prompt';
import type * as Telemetry from 'effect/unstable/ai/Telemetry';

import { SpanAttributes } from '@dxos/effect';
import { log } from '@dxos/log';

/** Span attributes carrying AI capture, outside the `gen_ai.*` semantic conventions. */
export const ATTRIBUTES = {
  /** Conversation identity, so the sink can group a conversation's turns. */
  sessionId: 'dxos.ai.session_id',
  /** Space the call runs in; the sink denies content when it is absent. */
  spaceId: SpanAttributes.SPACE_ID,
  input: 'dxos.ai.input',
  output: 'dxos.ai.output',
  tools: 'dxos.ai.tools',
  /** Set when any of the above was cut to fit, so a consumer does not read a fragment as the whole. */
  truncated: 'dxos.ai.truncated',
  /**
   * Prompt-cache token counts. Not content, and carried here only because the GenAI conventions have
   * nowhere for them: `Telemetry.UsageAttributes` is input/output tokens and nothing else, so
   * `gen_ai.usage.*` cannot express a cache hit.
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

const DEFAULT_MAX_CONTENT_LENGTH = 64_000;

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
 * transformer does, and reports whether it was cut.
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
 * response, and tool names, plus the prompt-cache token counts.
 */
export const makeSpanTransformer = (options?: SpanTransformerOptions): Telemetry.SpanTransformer => {
  const maxLength = options?.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH;

  // Effect calls the transformer on the model call's own fiber with no error handling, so a throw
  // here fails the call.
  const stamp = (span: Tracer.Span, key: string, value: () => unknown): boolean => {
    const content = serializeContent(key, value, maxLength);
    if (content === undefined) {
      return false;
    }
    span.attribute(key, content.serialized);
    return content.truncated;
  };

  return ({ prompt, tools, response, span }) => {
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

/** Nothing rather than zeroes when the provider reports no cache, so "no cache" reads apart from "no data". */
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

const field = (part: { readonly type: string }, key: string): unknown =>
  (part as unknown as Record<string, unknown>)[key];

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
      return { type: part.type };
  }
};

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
