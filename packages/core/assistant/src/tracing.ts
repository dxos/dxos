//
// Copyright 2026 DXOS.org
//

import { Trace } from '@dxos/functions';
import { Obj } from '@dxos/echo';
import { ContentBlock, Actor } from '@dxos/types';
import * as Schema from 'effect/Schema';

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

/**
 * Agent turn started (one LLM generation cycle).
 */
export const AgentTurnStarted = Trace.EventType('assistant.agentTurnStarted', {
  schema: Schema.Struct({
    /** Number of history messages. */
    historyLength: Schema.Number,
    /** Number of pending messages. */
    pendingLength: Schema.Number,
    /** System prompt length in characters. */
    systemPromptLength: Schema.Number,
  }),
  isEphemeral: false,
});

/**
 * Agent turn completed (LLM response received).
 */
export const AgentTurnCompleted = Trace.EventType('assistant.agentTurnCompleted', {
  schema: Schema.Struct({
    /** Number of messages produced in this turn. */
    messageCount: Schema.Number,
    /** Whether the agent is done (no more tool calls). */
    done: Schema.Boolean,
  }),
  isEphemeral: false,
});

/**
 * Tool execution started.
 */
export const ToolCallStarted = Trace.EventType('assistant.toolCallStarted', {
  schema: Schema.Struct({
    /** Tool name. */
    name: Schema.String,
    /** Tool call ID. */
    toolCallId: Schema.String,
  }),
  isEphemeral: false,
});

/**
 * Tool execution completed.
 */
export const ToolCallCompleted = Trace.EventType('assistant.toolCallCompleted', {
  schema: Schema.Struct({
    /** Tool name. */
    name: Schema.String,
    /** Tool call ID. */
    toolCallId: Schema.String,
    /** Whether the tool call resulted in an error. */
    isError: Schema.Boolean,
  }),
  isEphemeral: false,
});

/**
 * Agent process received input (prompt or tool result).
 */
export const AgentInputReceived = Trace.EventType('assistant.agentInputReceived', {
  schema: Schema.Struct({
    /** Type of input: 'prompt' or 'tool_result'. */
    inputType: Schema.String,
    /** Length of input content. */
    contentLength: Schema.Number,
  }),
  isEphemeral: false,
});

/**
 * Agent process request completed.
 */
export const AgentRequestCompleted = Trace.EventType('assistant.agentRequestCompleted', {
  schema: Schema.Struct({
    /** Number of pending items remaining in queue. */
    pendingItems: Schema.Number,
  }),
  isEphemeral: false,
});
