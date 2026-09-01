//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Prompt from 'effect/unstable/ai/Prompt';
import type * as Telemetry from 'effect/unstable/ai/Telemetry';

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
