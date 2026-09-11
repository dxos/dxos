//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

/**
 * Attribute naming the space a span's work ran in. One key everywhere — ECHO, the process runtime,
 * the stores, the AI stack — so one filter finds all of a space's work.
 */
export const SPACE_ID = 'spaceId';

/**
 * Stamps the space on every span the effect opens, for a caller that knows the space but not which
 * spans the work below it will open. Leaves the effect alone when there is no space.
 */
export const annotateSpace =
  (spaceId: string | null | undefined) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    spaceId ? Effect.annotateSpans(SPACE_ID, spaceId)(effect) : effect;

/** Attributes the AI stack stamps on its spans and the AI analytics sink reads; one definition for both. */
export const AI = {
  /** Conversation identity, so the sink can group a conversation's turns. */
  sessionId: 'dxos.ai.session_id',
  input: 'dxos.ai.input',
  output: 'dxos.ai.output',
  tools: 'dxos.ai.tools',
  /** Set when any of the above was cut to fit, so a consumer does not read a fragment as the whole. */
  truncated: 'dxos.ai.truncated',
  /** Prompt-cache token counts, which the GenAI conventions have nowhere for. */
  cacheReadTokens: 'dxos.ai.cache_read_tokens',
  cacheWriteTokens: 'dxos.ai.cache_write_tokens',
  /** What a non-model span is to the sink: one of {@link AI_KIND}. */
  kind: 'dxos.ai.kind',
  /** Display name for a span whose OTel name is generic, e.g. the tool a `callTool` span ran. */
  name: 'dxos.ai.name',
} as const;

export const AI_KIND = {
  turn: 'turn',
  tool: 'tool',
} as const;

/** Attributes the process runtime stamps on the span around each handler dispatch. */
export const PROCESS = {
  id: 'dxos.process.id',
  key: 'dxos.process.key',
  parentId: 'dxos.process.parent_id',
} as const;

/** Attributes the trigger dispatcher stamps on a trigger invocation. */
export const TRIGGER = {
  id: 'dxos.trigger.id',
  kind: 'dxos.trigger.kind',
} as const;

/** Attribute naming the operation an invocation runs. */
export const OPERATION = {
  key: 'dxos.operation.key',
} as const;

/** Attribute listing the service keys a layer materialization provides. */
export const LAYER = {
  provides: 'dxos.layer.provides',
} as const;
