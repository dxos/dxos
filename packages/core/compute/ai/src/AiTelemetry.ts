//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

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
} as const;

export type ContentTransformerOptions = {
  /** Cap per serialized content attribute; oversized values are cut mid-JSON and forwarded raw. */
  maxContentLength?: number;
};

const DEFAULT_MAX_CONTENT_LENGTH = 200_000;

/**
 * Span transformer stamping prompt, response, and tool names onto the model-call span as
 * `dxos.ai.*` attributes. Effect's `LanguageModel` invokes it only when one is installed, so
 * whether content is serialized at all is the installer's decision, and whether it then leaves
 * the device is the sink's.
 */
export const makeContentSpanTransformer = (options?: ContentTransformerOptions): Telemetry.SpanTransformer => {
  const maxLength = options?.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH;
  const truncate = (value: string): string => (value.length > maxLength ? value.slice(0, maxLength) : value);

  // Effect calls the transformer on the model call's own fiber with no error handling, so a throw
  // here fails the call. Tool results are arbitrary values — a cycle or a BigInt throws from
  // `JSON.stringify` — so each attribute is built and stamped independently, and a failure costs
  // only its own attribute.
  const stamp = (span: Tracer.Span, key: string, value: () => unknown): void => {
    try {
      span.attribute(key, truncate(JSON.stringify(value())));
    } catch (err) {
      log.catch(err, { key });
    }
  };

  return ({ prompt, tools, response, span }) => {
    stamp(span, ATTRIBUTES.input, () => serializePrompt(prompt));
    stamp(span, ATTRIBUTES.output, () => serializeResponse(response));
    if (tools.length > 0) {
      stamp(span, ATTRIBUTES.tools, () => tools.map((tool) => ({ name: tool.name })));
    }
  };
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
