//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Schema from 'effect/Schema';

/**
 * The event vocabulary of a project. A project is an append-only log of these; the chat transcript
 * and the canvas are both folds over it, which is why neither is stored separately. Every payload
 * is immutable — a correction is a later event, never an edit.
 *
 * The `type` column holds the tag, so a reader can select one kind of event without decoding the
 * rest of the log.
 */

/** What a presentation carries. Only these reach the user's screen; stdout does not. */
export const PresentationKind = Schema.Literals(['markdown', 'mermaid', 'table', 'json', 'text']);

export type PresentationKind = typeof PresentationKind.Type;

/**
 * Narrows what the sandbox sent. A snippet is not trusted to name a kind correctly, and a run that
 * displayed something should not be lost over a typo, so anything unrecognised renders as text.
 */
export const toKind = (value: string): PresentationKind => {
  switch (value) {
    case 'markdown':
    case 'mermaid':
    case 'table':
    case 'json':
      return value;
    default:
      return 'text';
  }
};

/** A user turn, as typed. */
export class UserMessage extends Schema.TaggedClass<UserMessage>('code-index/UserMessage')('UserMessage', {
  text: Schema.String,
}) {}

/** An assistant turn's prose. Tool calls are their own events, so a turn can span several. */
export class AssistantMessage extends Schema.TaggedClass<AssistantMessage>('code-index/AssistantMessage')(
  'AssistantMessage',
  {
    text: Schema.String,
  },
) {}

/** The agent asked to run code in the sandbox. */
export class ToolCall extends Schema.TaggedClass<ToolCall>('code-index/ToolCall')('ToolCall', {
  callId: Schema.String,
  code: Schema.String,
}) {}

/** What the sandbox returned to the agent — the model's view, not the user's. */
export class ToolResult extends Schema.TaggedClass<ToolResult>('code-index/ToolResult')('ToolResult', {
  callId: Schema.String,
  ok: Schema.Boolean,
  output: Schema.String,
}) {}

/**
 * Something the sandbox published to the screen through the `display` API. The agent is told the
 * user sees nothing else, so this is the whole of the visible answer.
 */
export class Presented extends Schema.TaggedClass<Presented>('code-index/Presented')('Presented', {
  callId: Schema.optional(Schema.String),
  kind: PresentationKind,
  title: Schema.optional(Schema.String),
  content: Schema.String,
}) {}

/** The canvas was emptied — a UI macro, and therefore an event like any other. */
export class CanvasCleared extends Schema.TaggedClass<CanvasCleared>('code-index/CanvasCleared')('CanvasCleared', {}) {}

/** The project was renamed. The title is a fold, so this needs no row to update. */
export class TitleSet extends Schema.TaggedClass<TitleSet>('code-index/TitleSet')('TitleSet', {
  title: Schema.String,
}) {}

/** A turn ended abnormally (model error, cancellation) — recorded so the transcript stays honest. */
export class TurnFailed extends Schema.TaggedClass<TurnFailed>('code-index/TurnFailed')('TurnFailed', {
  message: Schema.String,
}) {}

export const Event = Schema.Union([
  UserMessage,
  AssistantMessage,
  ToolCall,
  ToolResult,
  Presented,
  CanvasCleared,
  TitleSet,
  TurnFailed,
]);

export type Event = typeof Event.Type;

/** An event as the log stores it: the payload plus its position. */
export const Entry = Schema.Struct({
  projectId: Schema.String,
  seq: Schema.Number,
  event: Event,
});

export type Entry = typeof Entry.Type;

export const decode = Schema.decodeUnknownEffect(Event);

export const encode = Schema.encodeUnknownEffect(Event);
