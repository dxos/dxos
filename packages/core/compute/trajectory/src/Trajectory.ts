//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Skill from '@dxos/compute/Skill';
import { Annotation, DXN, Feed, Obj, Ref, Type } from '@dxos/echo';
import { IdentityDid } from '@dxos/keys';
import { ContentBlock } from '@dxos/types';

/**
 * Id of an earlier event in the same log; events reference each other by id because they are never mutated.
 */
export const EventId = Obj.ID;
export type EventId = Schema.Schema.Type<typeof EventId>;

//
// Sender
//

/**
 * `event` marks content from outside the conversation (alarm, webhook, email, background result), which the model
 * sees as a synthetic user turn rather than as something a person typed.
 */
export const Role = Schema.Literals(['user', 'assistant', 'tool', 'event']);
export type Role = Schema.Schema.Type<typeof Role>;

export const Sender = Schema.Struct({
  role: Role,
  /** Writer's identity, which tells participants apart in a multi-tenant chat. */
  identity: Schema.optional(IdentityDid),
  /** Object the sender stands for when it is not a person (agent session, service, hook). */
  subject: Schema.optional(Ref.Ref(Obj.Unknown)),
  name: Schema.optional(Schema.String),
});
export type Sender = Schema.Schema.Type<typeof Sender>;

//
// Content
//

/**
 * Content seen by the model, attributed by the event's `sender`. A user message stays out of the prompt until a
 * {@link PromptConsume} names it, so a prompt typed mid-turn never lands inside a prefix already sent.
 */
export const Message = Schema.TaggedStruct('message', {
  blocks: Schema.Array(ContentBlock.Any),
});
export type Message = Schema.Schema.Type<typeof Message>;

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
  /** Model DXN, as `SessionConfig.model` stores it. */
  model: DXN.Schema,
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
// Prompt queue (pending = user messages with no consume or cancel).
//

/**
 * The agent took a user message into its next turn; the message enters the prompt at this event's position.
 */
export const PromptConsume = Schema.TaggedStruct('promptConsume', {
  message: EventId,
});
export type PromptConsume = Schema.Schema.Type<typeof PromptConsume>;

export const PromptCancel = Schema.TaggedStruct('promptCancel', {
  message: EventId,
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
  summary: Schema.Array(ContentBlock.Any),
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
  summary: Schema.optional(Schema.Array(ContentBlock.Any)),
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
  model: DXN.Schema,
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
  data: Schema.optional(Schema.Unknown),
  blocks: Schema.optional(Schema.Array(ContentBlock.Any)),
});
export type Custom = Schema.Schema.Type<typeof Custom>;

export const Payload = Schema.Union([
  Message,
  TurnBegin,
  TurnEnd,
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
export type Payload = Schema.Schema.Type<typeof Payload>;

export type PayloadTag = Payload['_tag'];

export type PayloadOf<T extends PayloadTag> = Extract<Payload, { _tag: T }>;

//
// Event
//

/**
 * One immutable entry in an agent trajectory; every conversation state (history, queue, alarms, bindings, threads)
 * is a reduction over the feed's events in feed order.
 */
export class Event extends Type.makeObject<Event>(DXN.make('org.dxos.type.trajectory.event', '0.1.0'))(
  Schema.Struct({
    /** Thread the event belongs to: the id of its `threadOpen` event, absent for the main thread. */
    thread: Schema.optional(EventId),
    /** Writer's head of `thread` when appending, so concurrent writers can be detected. */
    prev: Schema.optional(EventId),
    sender: Sender,
    /** ISO timestamp; display only, ordering is by feed position. */
    created: Schema.String.pipe(Annotation.GeneratorAnnotation.set('date.iso8601')),
    payload: Payload,
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--path--regular', hue: 'indigo' })),
) {}

/**
 * An event narrowed to one payload kind.
 */
export type EventOf<T extends PayloadTag> = Event & { readonly payload: PayloadOf<T> };

export type MakeProps<T extends Payload = Payload> = {
  payload: T;
  sender: Sender;
  thread?: EventId;
  prev?: EventId;
  created?: string;
};

/**
 * Creates an event (not yet appended to a feed).
 */
export const make = <T extends Payload>({ payload, sender, thread, prev, created }: MakeProps<T>): Event =>
  Obj.make(Event, {
    thread,
    prev,
    sender,
    created: created ?? new Date().toISOString(),
    payload,
  });

/**
 * Narrows an event by payload tag.
 */
export const is = <T extends PayloadTag>(event: Event, tag: T): event is EventOf<T> => event.payload._tag === tag;
