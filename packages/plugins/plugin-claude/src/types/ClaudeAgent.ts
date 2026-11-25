//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Rpc from 'effect/rpc/Rpc';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';

/**
 * Claude Code working a chat's tasks in an EDGE sandbox. The process targets the chat
 * (`Process.TargetAnnotation`), writes the agent's turns into it, and watches the tasks assigned on
 * it; operations only start it, send it input and read its state.
 */
export const KEY = 'org.dxos.process.claude-agent';

export const Status = Schema.Literals(['starting', 'working', 'idle', 'stalled', 'done', 'failed']);
export type Status = Schema.Schema.Type<typeof Status>;

export const Input = Schema.Union([
  /** Queues a prompt for the next turn; a `turnId` the process has seen is ignored. */
  Schema.TaggedStruct('prompt', { turnId: Schema.String, text: Schema.String }),
  /** Tasks newly assigned on the chat, by object id; the process reads them from the chat. */
  Schema.TaggedStruct('assign', { tasks: Schema.Array(Schema.String) }),
  /** Stops the running turn. */
  Schema.TaggedStruct('cancel', {}),
]);
export type Input = Schema.Schema.Type<typeof Input>;

export const Output = Schema.Union([
  /** A session update from the agent (text, a tool call), in the order it produced them. */
  Schema.TaggedStruct('update', { turnId: Schema.String, update: Schema.Unknown }),
  /** The agent asks to use a tool. */
  Schema.TaggedStruct('permission', { turnId: Schema.String, requestId: Schema.String }),
  Schema.TaggedStruct('turn-end', { turnId: Schema.String, stopReason: Schema.String }),
  Schema.TaggedStruct('status', { status: Status, detail: Schema.optional(Schema.String) }),
]);
export type Output = Schema.Schema.Type<typeof Output>;

export const State = Schema.Struct({
  status: Status,
  /** The turn running now. */
  turnId: Schema.NullOr(Schema.String),
  /** Prompts waiting for the running turn to end. */
  queued: Schema.Number,
  /** The last text block of the transcript. */
  latest: Schema.optional(Schema.String),
});
export type State = Schema.Schema.Type<typeof State>;

export const Control = RpcGroup.make(
  Rpc.make('getState', { success: State }),
  Rpc.make('respondPermission', {
    payload: Schema.Struct({ requestId: Schema.String, optionId: Schema.NullOr(Schema.String) }),
    success: Schema.Struct({ answered: Schema.Boolean }),
  }),
);

/** The durable operation; its handler is attached where the runtime that hosts it is assembled. */
export const ClaudeAgent = Operation.makeDurable({
  key: KEY,
  name: 'Claude agent',
  input: Input,
  output: Output,
  services: [],
  rpcs: Control,
});
