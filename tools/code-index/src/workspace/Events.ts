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
export const PresentationKind = Schema.Literals(['markdown', 'mermaid', 'table', 'json', 'text', 'graph']);

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
    case 'graph':
      return value;
    default:
      return 'text';
  }
};

const mintId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Identifies one code run across the three events that describe it — the call, whatever it
 * displayed, and its result. `Fold.apply` joins them on this, so it is minted before the call is
 * appended and reused verbatim; deriving it from anything written later leaves the join unmade.
 */
export const newCallId = (): string => mintId();

/**
 * Identifies one turn across the message that opens it and the event that closes it, so a reader
 * can tell whose turn an end event closes. Minted by whoever sends the prompt — the browser mints it
 * so it can recognise its own turn when the log echoes it back.
 */
export const newTurnId = (): string => mintId();

/**
 * Identifies one assistant message across the deltas that stream it and the `AssistantMessage` that
 * settles it, so `Fold.apply` can grow the right message and then replace it with the final text.
 */
export const newMessageId = (): string => mintId();

/**
 * The turn id is optional on every turn event because logs written before it existed must still
 * decode; `Fold.apply` lets an id-less end event close whatever turn is open.
 */
const TurnId = Schema.optional(Schema.String);

/** A user turn, as typed. */
export class UserMessage extends Schema.TaggedClass<UserMessage>('code-index/UserMessage')('UserMessage', {
  text: Schema.String,
  turnId: TurnId,
}) {}

/**
 * An assistant turn's prose. Tool calls are their own events, so a turn can span several. A message
 * that streamed carries the id its deltas did and supersedes them; one without an id stands alone.
 */
export class AssistantMessage extends Schema.TaggedClass<AssistantMessage>('code-index/AssistantMessage')(
  'AssistantMessage',
  {
    text: Schema.String,
    messageId: Schema.optional(Schema.String),
    turnId: TurnId,
  },
) {}

/**
 * A fragment of an assistant message as the model generates it. Persisted so a reload mid-message
 * replays the partial text, and deleted once the `AssistantMessage` with the same id lands, so the
 * log keeps one row per message rather than one per token.
 */
export class AssistantDelta extends Schema.TaggedClass<AssistantDelta>('code-index/AssistantDelta')('AssistantDelta', {
  messageId: Schema.String,
  delta: Schema.String,
  turnId: TurnId,
}) {}

/** The agent asked to run code in the sandbox. */
export class ToolCall extends Schema.TaggedClass<ToolCall>('code-index/ToolCall')('ToolCall', {
  callId: Schema.String,
  code: Schema.String,
  turnId: TurnId,
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
  turnId: TurnId,
}) {}

/**
 * A model reply the agent could not use — a malformed tool call — and went back to the model about.
 * The turn carries on; this is recorded so the transcript shows why it took an extra step.
 */
export class StepRetried extends Schema.TaggedClass<StepRetried>('code-index/StepRetried')('StepRetried', {
  message: Schema.String,
  turnId: TurnId,
}) {}

/**
 * The turn is over. Recorded so "is the agent still working?" is answered by the log rather than
 * inferred from the last message's shape — a second client watching the same project needs the
 * same answer, and prose arrives mid-turn as well as at the end.
 */
export class TurnEnded extends Schema.TaggedClass<TurnEnded>('code-index/TurnEnded')('TurnEnded', {
  steps: Schema.Number,
  turnId: TurnId,
}) {}

export const Event = Schema.Union([
  UserMessage,
  AssistantMessage,
  AssistantDelta,
  ToolCall,
  ToolResult,
  Presented,
  CanvasCleared,
  TitleSet,
  StepRetried,
  TurnEnded,
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
