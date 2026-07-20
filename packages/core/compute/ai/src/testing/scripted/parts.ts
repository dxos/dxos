//
// Copyright 2026 DXOS.org
//

import type * as Response from '@effect/ai/Response';

/**
 * Synthesizes the low-level `@effect/ai` response parts a scripted turn replays.
 *
 * The shapes mirror what a real provider emits so both tool-call consumers execute:
 * - DXOS's `AiParser` (the assistant session path) reconstructs tool calls from the raw
 *   `tool-params-*` parts and ignores the resolved `tool-call` part.
 * - `@effect/ai`'s built-in tool resolution (`LanguageModel`/`Chat` with resolution enabled)
 *   executes the resolved `tool-call` part and ignores `tool-params-*`.
 * A real provider emits both, so streaming tool turns emit both here too.
 */

/** Message ids are irrelevant to the parser; a fixed epoch keeps synthesized parts deterministic. */
const EPOCH_TIMESTAMP = '1970-01-01T00:00:00.000Z';

/** Tests assert on tool/DB side-effects, not token accounting, so usage is reported as zero. */
const ZERO_USAGE = { inputTokens: 0, outputTokens: 0, totalTokens: 0 } as const;

const EMPTY_METADATA = {} as const;

/** A tool call resolved for synthesis: a stable id, the model-facing name, and the input as JSON. */
export interface SynthesizedToolCall {
  readonly id: string;
  readonly name: string;
  readonly inputJson: string;
}

/** A single scripted turn resolved for synthesis. */
export interface SynthesizedTurn {
  readonly text?: string;
  readonly tools: readonly SynthesizedToolCall[];
  readonly reason: Response.FinishReason;
}

export interface SynthesizedMeta {
  readonly responseId: string;
  readonly modelId: string;
}

/**
 * Synthesizes the streaming parts for a turn: `response-metadata`, optional `text-start`/`-delta`/`-end`,
 * `tool-params-start`/`-delta`/`-end` for each tool call, then `finish`.
 */
export const streamParts = (turn: SynthesizedTurn, meta: SynthesizedMeta): Response.StreamPartEncoded[] => {
  const parts: Response.StreamPartEncoded[] = [
    {
      type: 'response-metadata',
      id: meta.responseId,
      modelId: meta.modelId,
      timestamp: EPOCH_TIMESTAMP,
      metadata: EMPTY_METADATA,
    },
  ];
  if (turn.text !== undefined) {
    parts.push({ type: 'text-start', id: '0', metadata: EMPTY_METADATA });
    parts.push({ type: 'text-delta', id: '0', delta: turn.text, metadata: EMPTY_METADATA });
    parts.push({ type: 'text-end', id: '0', metadata: EMPTY_METADATA });
  }
  for (const tool of turn.tools) {
    parts.push({
      type: 'tool-params-start',
      id: tool.id,
      name: tool.name,
      providerExecuted: false,
      metadata: EMPTY_METADATA,
    });
    parts.push({ type: 'tool-params-delta', id: tool.id, delta: tool.inputJson, metadata: EMPTY_METADATA });
    parts.push({ type: 'tool-params-end', id: tool.id, metadata: EMPTY_METADATA });
    parts.push({
      type: 'tool-call',
      id: tool.id,
      name: tool.name,
      params: JSON.parse(tool.inputJson),
      providerExecuted: false,
      metadata: EMPTY_METADATA,
    });
  }
  parts.push({ type: 'finish', reason: turn.reason, usage: ZERO_USAGE, metadata: EMPTY_METADATA });
  return parts;
};

/**
 * Synthesizes the non-streaming parts for a turn: `response-metadata`, an optional `text` part, a
 * resolved `tool-call` part for each tool call, then `finish`. The non-stream `PartEncoded` union has
 * no `tool-params-*`, so the resolved `tool-call` is the only representation here.
 */
export const generateParts = (turn: SynthesizedTurn, meta: SynthesizedMeta): Response.PartEncoded[] => {
  const parts: Response.PartEncoded[] = [
    {
      type: 'response-metadata',
      id: meta.responseId,
      modelId: meta.modelId,
      timestamp: EPOCH_TIMESTAMP,
      metadata: EMPTY_METADATA,
    },
  ];
  if (turn.text !== undefined) {
    parts.push({ type: 'text', text: turn.text, metadata: EMPTY_METADATA });
  }
  for (const tool of turn.tools) {
    parts.push({
      type: 'tool-call',
      id: tool.id,
      name: tool.name,
      params: JSON.parse(tool.inputJson),
      providerExecuted: false,
      metadata: EMPTY_METADATA,
    });
  }
  parts.push({ type: 'finish', reason: turn.reason, usage: ZERO_USAGE, metadata: EMPTY_METADATA });
  return parts;
};
