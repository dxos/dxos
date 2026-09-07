//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Trace from '@dxos/compute/Trace';
import { Obj } from '@dxos/echo';
import { Actor, ContentBlock } from '@dxos/types';

/**
 * Partial content block emitted.
 */
export const PartialBlock = Trace.EventType('assistant.partialBlock', {
  schema: Schema.Struct({
    messageId: Obj.ID,
    role: Actor.Role,
    block: ContentBlock.Any,
  }),
  isEphemeral: true,
});

/**
 * Complete content block emitted.
 */
export const CompleteBlock = Trace.EventType('assistant.completeBlock', {
  schema: Schema.Struct({
    messageId: Obj.ID,
    role: Actor.Role,
    block: ContentBlock.Any,
  }),
  isEphemeral: false,
});

export const AgentRequestBegin = Trace.EventType('assistant.agentRequestBegin', {
  schema: Schema.Struct({}),
  isEphemeral: false,
});

export const AgentRequestEnd = Trace.EventType('assistant.agentRequestEnd', {
  schema: Schema.Struct({
    status: Schema.Literals(['success', 'error', 'interrupted']),
    error: Schema.optional(Schema.String),
  }),
  isEphemeral: false,
});

/**
 * Emitted when an MCP server connection fails for a request turn.
 * Ephemeral so that misconfigured/unreachable servers don't pollute the durable feed,
 * but can still be surfaced to the user via the live ephemeral event stream.
 */
export const McpServerError = Trace.EventType('assistant.mcpServerError', {
  schema: Schema.Struct({
    url: Schema.String,
    protocol: Schema.Literals(['sse', 'http']),
    message: Schema.String,
  }),
  isEphemeral: true,
});

/**
 * Stage of a request's setup, in the order a turn passes through them.
 *
 * The reader waits through all of these before the first token arrives, and the wait is dominated by
 * whichever one is slow for their setup (a cold MCP server, a summarization pass over a long feed),
 * so each is named rather than folded into a single "working" state.
 */
export const RequestPhaseName = Schema.Literals([
  /** Client-side: the agent process is being spawned or attached. Never emitted by the agent itself. */
  'starting',
  /** The turn fiber has begun; nothing has been loaded yet. */
  'preparing',
  'loading-history',
  'summarizing',
  'connecting-mcp',
  'building-toolkit',
  'encoding-prompt',
  'contacting-provider',
]);
export type RequestPhaseName = Schema.Schema.Type<typeof RequestPhaseName>;

/**
 * Setup stage a request has reached, emitted as the agent enters it.
 *
 * Ephemeral: this is progress for a wait that is over by the time anyone could read it back, and the
 * feed already records the turn's outcome. The UI shows the latest phase until the first streamed
 * block replaces it.
 */
export const RequestPhase = Trace.EventType('assistant.requestPhase', {
  schema: Schema.Struct({
    phase: RequestPhaseName,

    /**
     * 1-based attempt at the phase. Only `contacting-provider` re-attempts (a request the provider
     * rejected for permissions that have not propagated yet), and only there does a value above 1
     * mean anything to the reader.
     */
    attempt: Schema.optional(Schema.Number),

    /** Phase-specific label, e.g. the number of MCP servers being contacted. */
    detail: Schema.optional(Schema.String),
  }),
  isEphemeral: true,
});

/**
 * Emit the setup stage the request has reached.
 */
export const emitRequestPhase = (
  phase: RequestPhaseName,
  opts: { attempt?: number; detail?: string } = {},
): Effect.Effect<void, never, Trace.TraceService> => Trace.write(RequestPhase, { phase, ...opts });
