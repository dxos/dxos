//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import type * as Tracer from 'effect/Tracer';
import type * as Prompt from 'effect/unstable/ai/Prompt';
import type * as Response from 'effect/unstable/ai/Response';
import type * as Telemetry from 'effect/unstable/ai/Telemetry';

import { SpanAttributes } from '@dxos/effect';
import { log } from '@dxos/log';

/** Span attributes carrying AI capture, outside the `gen_ai.*` semantic conventions. */
export const ATTRIBUTES = { spaceId: SpanAttributes.SPACE_ID, ...SpanAttributes.AI } as const;

export const KIND = SpanAttributes.AI_KIND;

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
const stampCacheUsage = (span: Tracer.Span, response: ReadonlyArray<Response.AllParts<any>>): void => {
  const finish = response.find((part): part is Response.FinishPart => part.type === 'finish');
  const inputTokens = finish?.usage.inputTokens;
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

const serializePrompt = (prompt: Prompt.Prompt): unknown[] =>
  prompt.content.map((message) => ({
    role: message.role,
    content: typeof message.content === 'string' ? message.content : message.content.map(serializePart),
  }));

const serializePart = (part: Prompt.Part): unknown => {
  switch (part.type) {
    case 'text':
    case 'reasoning':
      return { type: part.type, text: part.text };
    case 'tool-call':
      return { type: 'function', function: { name: part.name, arguments: part.params } };
    case 'tool-result':
      return { type: 'tool-result', name: part.name, result: part.result };
    default:
      return { type: part.type };
  }
};

const serializeResponse = (response: ReadonlyArray<Response.AllParts<any>>): unknown[] => {
  let text = '';
  let reasoning = '';
  const content: unknown[] = [];
  for (const part of response) {
    switch (part.type) {
      case 'text':
        text += part.text;
        break;
      case 'text-delta':
        text += part.delta;
        break;
      case 'reasoning':
        reasoning += part.text;
        break;
      case 'reasoning-delta':
        reasoning += part.delta;
        break;
      case 'tool-call':
        content.push({ type: 'function', function: { name: part.name, arguments: part.params } });
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
