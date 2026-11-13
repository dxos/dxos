//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Feed, Filter, Obj, Query, Ref, Type } from '@dxos/echo';

import * as Message from './Message.ts';

export const ThreadStatus = Schema.Union([
  Schema.Literal('staged'),
  Schema.Literal('active'),
  Schema.Literal('resolved'),
]);

/** Per-thread agent firing policy. */
export const AgentMode = Schema.Union([Schema.Literal('auto'), Schema.Literal('mention')]);
export type AgentMode = Schema.Schema.Type<typeof AgentMode>;

/**
 * Per-thread AI agent configuration.
 *
 * Stored as an optional field on Thread. The agent's identity (display name,
 * DID) is deliberately NOT stored here — it is resolved at runtime via the
 * AgentIdentity Effect service so that renaming the agent globally affects
 * past threads too.
 */
export const AgentConfig = Schema.Struct({
  enabled: Schema.Boolean,
  mode: AgentMode,
});
export interface AgentConfig extends Schema.Schema.Type<typeof AgentConfig> {}

/**
 * ECHO-backed message thread whose messages live in a feed it owns, so an agent can run on the same
 * feed (see `plugin-review/docs/COMMENT-FEEDS.md`).
 */
export class Thread extends Type.makeObject<Thread>(DXN.make('org.dxos.type.thread', '0.3.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    status: ThreadStatus.pipe(Schema.optional),
    feed: Ref.Ref(Feed.Feed).pipe(Annotation.SetParent.set(), Annotation.FormInputAnnotation.set(false)),
    agent: Schema.optional(AgentConfig),
  }),
) {}

/**
 * Thread schema before its messages moved into a feed; kept only as the source of the 0.2.0 → 0.3.0 migration.
 * @deprecated Use {@link Thread}.
 */
export class LegacyThread extends Type.makeObject<LegacyThread>(DXN.make('org.dxos.type.thread', '0.2.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    status: ThreadStatus.pipe(Schema.optional),
    messages: Schema.Array(Ref.Ref(Message.Message)),
    agent: Schema.optional(AgentConfig),
  }),
) {}

/** Creates a thread with a fresh feed; the feed is added to the database with the thread. */
export const make = ({ status = 'staged', feed, ...props }: Partial<Obj.MakeProps<typeof Thread>> = {}): Thread =>
  Obj.make(Thread, { status, feed: feed ?? Ref.make(Feed.make()), ...props });

/** Query for the messages in a thread's feed; pair with {@link sortMessages}, since a query returns an unordered set. */
export const messagesQuery = (feed: Feed.Feed) => Query.select(Filter.type(Message.Message)).from(feed);

/**
 * Orders messages by when they were sent. Not by feed position: an edit re-appends a feed item and takes a new
 * position, which would move an edited or restored message to the end.
 */
export const sortMessages = (messages: readonly Message.Message[]): Message.Message[] =>
  [...messages].sort((left, right) => left.created.localeCompare(right.created) || left.id.localeCompare(right.id));

/** Loads a persisted thread's messages in send order; a thread not yet in a database has none. */
export const loadMessages = async (thread: Thread): Promise<Message.Message[]> => {
  const db = Obj.getDatabase(thread);
  if (!db) {
    return [];
  }
  const feed = await thread.feed.load();
  return sortMessages(await db.query(messagesQuery(feed)).run());
};
