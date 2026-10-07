//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Skill from '@dxos/compute/Skill';
import { Feed, Obj, Ref } from '@dxos/echo';
import { ContentBlock } from '@dxos/types';

/**
 * Id of an earlier event in the same log; events reference each other by id because they are never mutated.
 */
export const EventId = Obj.ID;
export type EventId = Schema.Schema.Type<typeof EventId>;

//
// Content
//

export const Role = Schema.Literals(['user', 'assistant', 'tool']);
export type Role = Schema.Schema.Type<typeof Role>;

/**
 * A complete conversational turn fragment seen by the model.
 */
export const Message = Schema.TaggedStruct('message', {
  role: Role,
  blocks: Schema.Array(ContentBlock.Any),
});
export type Message = Schema.Schema.Type<typeof Message>;

/**
 * Content that arrived from outside the conversation (webhook, email, fired alarm, background result).
 * The model sees it as a synthetic user turn, so it is kept distinct from prompts a person typed.
 */
export const External = Schema.TaggedStruct('external', {
  /** Origin of the content (e.g. `alarm`, `tool`, `email`). */
  source: Schema.String,
  blocks: Schema.Array(ContentBlock.Any),
});
export type External = Schema.Schema.Type<typeof External>;

//
// Turn
//

export const Usage = Schema.Struct({
  inputTokens: Schema.optional(Schema.Number),
  outputTokens: Schema.optional(Schema.Number),
  cacheReadTokens: Schema.optional(Schema.Number),
  cacheWriteTokens: Schema.optional(Schema.Number),
});
export type Usage = Schema.Schema.Type<typeof Usage>;

/**
 * Start of one model request.
 */
export const TurnBegin = Schema.TaggedStruct('turnBegin', {
  model: Schema.String,
  /** Hash of the serialized prompt, so a cache miss can be traced to the request that caused it. */
  promptHash: Schema.optional(Schema.String),
});
export type TurnBegin = Schema.Schema.Type<typeof TurnBegin>;

export const TurnEnd = Schema.TaggedStruct('turnEnd', {
  begin: EventId,
  finishReason: ContentBlock.FinishReason,
  usage: Schema.optional(Usage),
  error: Schema.optional(Schema.String),
});
export type TurnEnd = Schema.Schema.Type<typeof TurnEnd>;

//
// Prompt queue (op-based: pending = enqueued − consumed − cancelled).
//

export const PromptEnqueue = Schema.TaggedStruct('promptEnqueue', {
  blocks: Schema.Array(ContentBlock.Any),
});
export type PromptEnqueue = Schema.Schema.Type<typeof PromptEnqueue>;

export const PromptConsume = Schema.TaggedStruct('promptConsume', {
  enqueue: EventId,
});
export type PromptConsume = Schema.Schema.Type<typeof PromptConsume>;

export const PromptCancel = Schema.TaggedStruct('promptCancel', {
  enqueue: EventId,
});
export type PromptCancel = Schema.Schema.Type<typeof PromptCancel>;

//
// Context
//

const ContextDelta = {
  skills: Schema.Array(Ref.Ref(Skill.Skill)),
  objects: Schema.Array(Ref.Ref(Obj.Unknown)),
};

export const ContextBind = Schema.TaggedStruct('contextBind', ContextDelta);
export type ContextBind = Schema.Schema.Type<typeof ContextBind>;

export const ContextUnbind = Schema.TaggedStruct('contextUnbind', ContextDelta);
export type ContextUnbind = Schema.Schema.Type<typeof ContextUnbind>;

//
// Alarms
//

export const AlarmSet = Schema.TaggedStruct('alarmSet', {
  /** Epoch milliseconds. */
  wakeAt: Schema.Number,
  message: Schema.optional(Schema.String),
});
export type AlarmSet = Schema.Schema.Type<typeof AlarmSet>;

export const AlarmCancel = Schema.TaggedStruct('alarmCancel', {
  alarm: EventId,
});
export type AlarmCancel = Schema.Schema.Type<typeof AlarmCancel>;

export const AlarmFire = Schema.TaggedStruct('alarmFire', {
  alarm: EventId,
});
export type AlarmFire = Schema.Schema.Type<typeof AlarmFire>;

//
// Background tools
//

/**
 * A tool call that outlived its turn; its result arrives later as {@link ToolDeliver}.
 */
export const ToolBackground = Schema.TaggedStruct('toolBackground', {
  toolCallId: Schema.String,
  /** Process running the call. */
  pid: Schema.optional(Schema.String),
});
export type ToolBackground = Schema.Schema.Type<typeof ToolBackground>;

export const ToolDeliver = Schema.TaggedStruct('toolDeliver', {
  toolCallId: Schema.String,
  result: ContentBlock.ToolResult,
});
export type ToolDeliver = Schema.Schema.Type<typeof ToolDeliver>;

//
// Hooks
//

export const HookKind = Schema.Literals(['inline', 'background', 'agentic']);
export type HookKind = Schema.Schema.Type<typeof HookKind>;

export const HookBegin = Schema.TaggedStruct('hookBegin', {
  hook: Schema.String,
  kind: HookKind,
  /** Thread an agentic hook runs in. */
  thread: Schema.optional(EventId),
});
export type HookBegin = Schema.Schema.Type<typeof HookBegin>;

export const HookEnd = Schema.TaggedStruct('hookEnd', {
  begin: EventId,
  /** Output of an inline hook, which the model sees. */
  blocks: Schema.optional(Schema.Array(ContentBlock.Any)),
  error: Schema.optional(Schema.String),
});
export type HookEnd = Schema.Schema.Type<typeof HookEnd>;

//
// Compaction
//

/**
 * Replaces the inclusive range `from`..`to` with `summary` in the prompt; the events themselves stay in the log.
 */
export const Compact = Schema.TaggedStruct('compact', {
  from: EventId,
  to: EventId,
  summary: Schema.String,
});
export type Compact = Schema.Schema.Type<typeof Compact>;

//
// Threads
//

export const ThreadMode = Schema.Literals(['fork', 'fresh']);
export type ThreadMode = Schema.Schema.Type<typeof ThreadMode>;

export const ThreadOrigin = Schema.Struct({
  /** Feed of another conversation; absent for the current one. */
  feed: Schema.optional(Ref.Ref(Feed.Feed)),
  event: EventId,
});
export type ThreadOrigin = Schema.Schema.Type<typeof ThreadOrigin>;

/**
 * Opens a thread whose id is this event's id.
 */
export const ThreadOpen = Schema.TaggedStruct('threadOpen', {
  mode: ThreadMode,
  /** Where a `fork` branches from; a `fresh` thread starts with no history. */
  from: Schema.optional(ThreadOrigin),
  purpose: Schema.optional(Schema.String),
});
export type ThreadOpen = Schema.Schema.Type<typeof ThreadOpen>;

export const MergeMode = Schema.Literals(['raw', 'summary']);
export type MergeMode = Schema.Schema.Type<typeof MergeMode>;

export const ThreadMerge = Schema.TaggedStruct('threadMerge', {
  thread: EventId,
  mode: MergeMode,
  summary: Schema.optional(Schema.String),
});
export type ThreadMerge = Schema.Schema.Type<typeof ThreadMerge>;

export const ThreadStatus = Schema.Literals(['completed', 'failed', 'cancelled']);
export type ThreadStatus = Schema.Schema.Type<typeof ThreadStatus>;

export const ThreadClose = Schema.TaggedStruct('threadClose', {
  thread: EventId,
  status: ThreadStatus,
});
export type ThreadClose = Schema.Schema.Type<typeof ThreadClose>;

//
// Config
//

export const ModelChange = Schema.TaggedStruct('modelChange', {
  model: Schema.String,
});
export type ModelChange = Schema.Schema.Type<typeof ModelChange>;

//
// Escape hatch
//

/**
 * Extension-defined event; `blocks` reach the model only when `visible` is set.
 */
export const Custom = Schema.TaggedStruct('custom', {
  /** Namespaced extension type (e.g. `org.example.checkpoint`). */
  type: Schema.String,
  visible: Schema.Boolean,
  data: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
  blocks: Schema.optional(Schema.Array(ContentBlock.Any)),
});
export type Custom = Schema.Schema.Type<typeof Custom>;

export const Any = Schema.Union([
  Message,
  External,
  TurnBegin,
  TurnEnd,
  PromptEnqueue,
  PromptConsume,
  PromptCancel,
  ContextBind,
  ContextUnbind,
  AlarmSet,
  AlarmCancel,
  AlarmFire,
  ToolBackground,
  ToolDeliver,
  HookBegin,
  HookEnd,
  Compact,
  ThreadOpen,
  ThreadMerge,
  ThreadClose,
  ModelChange,
  Custom,
]);
export type Any = Schema.Schema.Type<typeof Any>;

export type Tag = Any['_tag'];

export type Of<T extends Tag> = Extract<Any, { _tag: T }>;
