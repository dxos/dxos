//
// Copyright 2024 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';

import { AppAnnotation } from '@dxos/app-toolkit';
import { Annotation, type Database, DXN, Feed, Filter, Obj, Query, Ref, Tag, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';
import { type EntityId } from '@dxos/keys';
import { FeedAnnotation, StateMap, Tagging, TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

/**
 * Foreign-key source for Gmail provider labels. A Gmail label maps to a {@link Tag} object carrying
 * a foreign key `{ source: GMAIL_TAG_SOURCE, id: <gmail-label-id> }`; "provider" tags are those with
 * such a key, "user" tags are those without.
 */
export const GMAIL_TAG_SOURCE = 'com.google.gmail.label';

/**
 * Foreign keys that mark a message as person-to-person ("personal") mail, used to tell it from
 * bulk/marketing when deciding how aggressively to restyle a message body (see the HTML viewer).
 * Each provider contributes its own signal: Gmail persists the "Personal"/Primary inbox category
 * (`CATEGORY_PERSONAL`) during label sync. JMAP contributes nothing — its mailbox roles
 * (inbox/archive/sent/…) don't distinguish person-to-person from bulk mail — so it has no equivalent.
 */
export const PERSONAL_TAG_KEYS = [{ source: GMAIL_TAG_SOURCE, id: 'CATEGORY_PERSONAL' }] as const;

/**
 * Foreign-key source for JMAP provider folders (mailboxes). A JMAP mailbox maps to a {@link Tag}
 * object carrying a foreign key `{ source: JMAP_TAG_SOURCE, id: <jmap-mailbox-id> }`; mirrors
 * {@link GMAIL_TAG_SOURCE}.
 */
export const JMAP_TAG_SOURCE = 'org.ietf.jmap.mailbox';

export const SKILL_KEY = 'org.dxos.skill.inbox';

// TODO(burdon): Implement as labels?
export enum MessageStatus {
  NONE = 0,
  ARCHIVED = 1,
  DELETED = 2,
  SPAM = 3,
}

/** Per-message mutable state stored on the Mailbox (Messages are immutable feed items), keyed by message id. */
export const MessageState = Schema.Struct({
  /** ISO 8601 timestamp when the message was first opened; absent while the message is still new. */
  viewedAt: Schema.optional(Schema.String),
});
export type MessageState = Schema.Schema.Type<typeof MessageState>;

/** Mailbox object schema. */
export class Mailbox extends Type.makeObject<Mailbox>(DXN.make('org.dxos.type.mailbox', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    feed: Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false)),
    // Per-message mutable state keyed by message id. Feed Messages are immutable Queue items, so their
    // viewed marker (see `markThreadViewed`) lives in this child `StateMap` rather than on the message.
    // Created with the mailbox by `make`.
    messageState: Ref.Ref(StateMap.StateMap).pipe(FormInputAnnotation.set(false)),
    // Inverse tag index for immutable feed Messages: tag id (a `Tag` object's URI) → message ids.
    // Messages are immutable Queue items, so their tag associations live in a child `TagIndex` object
    // (the `meta.tags` augmentation for feed objects). Tag labels/hues live on the `Tag` objects.
    tags: Ref.Ref(TagIndex.TagIndex).pipe(FormInputAnnotation.set(false)),
    extractors: Schema.Struct({
      enabled: Schema.Array(Schema.String),
      threshold: Schema.Number.pipe(Schema.between(0, 1)),
    }).pipe(FormInputAnnotation.set(false), Schema.optional),
    // Provenance for extracted objects, keyed by message id → extracted object ids. Feed-stored
    // Messages are immutable Queue items and cannot be ECHO relation endpoints, so (like `tags`)
    // the association lives here on the mutable Mailbox. The referenced objects are space-db
    // objects resolved by id (`db.getObjectById`).
    extracted: Schema.Record({ key: Schema.String, value: Schema.Array(Schema.String) }).pipe(
      FormInputAnnotation.set(false),
      Schema.optional,
    ),
    // TODO(wittjosiah): Factor out to relation?
    filters: Schema.Array(
      Schema.Struct({
        name: Schema.String,
        filter: Schema.String,
      }),
    ).pipe(FormInputAnnotation.set(false)),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--tray--regular', hue: 'rose' }),
    FeedAnnotation.set(true),
    AppAnnotation.SkillsAnnotation.set([SKILL_KEY]),
  ),
) {}

/** Checks if a value is a Mailbox object. */
export const instanceOf = (value: unknown): value is Mailbox => Obj.instanceOf(Mailbox, value);

export const CreateMailboxSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
});

type MailboxProps = Omit<Obj.MakeProps<typeof Mailbox>, 'feed' | 'tags' | 'filters' | 'extractors' | 'messageState'> & {
  filters?: { name: string; filter: string }[];
  extractors?: { enabled: string[]; threshold: number };
};

/** Creates a mailbox object with a backing feed and per-message state map. */
export const make = (props: MailboxProps = {}) => {
  const feed = Feed.make();
  const tags = TagIndex.make();
  const messageState = StateMap.make();
  const mailbox = Obj.make(Mailbox, {
    feed: Ref.make(feed),
    tags: Ref.make(tags),
    messageState: Ref.make(messageState),
    filters: [],
    ...props,
  });

  // TODO(wittjosiah): Parent should be declarative in the schema.
  Obj.setParent(feed, mailbox);
  // Tag index and per-message state are children: cascade-deleted with the mailbox.
  Obj.setParent(tags, mailbox);
  Obj.setParent(messageState, mailbox);
  return mailbox;
};

//
// Per-message viewed state, keyed by message id (Messages are immutable feed items). A message is
// "new" until its conversation is first opened, at which point `markThreadViewed` stamps its `viewedAt`.
//

/** Feed window bounding the new-message count (see {@link newMessageCountAtom}). */
const NEW_MESSAGE_COUNT_WINDOW = 100;

/** Stamps a message's `viewedAt` to now via an already-bound accessor; a no-op once already viewed. */
const stamp = (state: StateMap.Accessor<MessageState>, messageId: EntityId): void => {
  if (state.get(messageId).viewedAt === undefined) {
    state.patch(messageId, { viewedAt: new Date().toISOString() });
  }
};

/** Marks a single message viewed, clearing its unread state; a no-op once already viewed. */
export const markViewed = (mailbox: Mailbox, messageId: EntityId): void => {
  const stateMap = mailbox.messageState.target;
  if (stateMap) {
    stamp(StateMap.bind<MessageState>(stateMap), messageId);
  }
};

/**
 * Marks a whole conversation viewed: every message in the resolved `thread` (as shown in the message
 * companion), clearing its unread state wholesale. Synchronous — call on mount of the surface that
 * renders the thread, passing the already-resolved messages.
 */
export const markThreadViewed = (
  mailbox: Mailbox,
  thread: readonly (Message.Message | Obj.Snapshot<Message.Message>)[],
): void => {
  const stateMap = mailbox.messageState.target;
  if (!stateMap) {
    return;
  }
  const state = StateMap.bind<MessageState>(stateMap);
  for (const message of thread) {
    stamp(state, message.id);
  }
};

/**
 * Reactive count of new (unread) *conversations* in a mailbox, keyed by the mailbox — Gmail-style: a
 * thread counts once if any of its messages is unviewed (not the number of unread messages). Resolves
 * the feed and per-message state map through their atoms so the count re-derives when messages sync or
 * a conversation is marked viewed. Bounded to the newest {@link NEW_MESSAGE_COUNT_WINDOW} messages.
 */
export const newMessageCountAtom = Atom.family((mailbox: Mailbox) =>
  Atom.make((get) => {
    const db = Obj.getDatabase(mailbox);
    const feed = get(mailbox.feed.atom);
    if (!db || !feed) {
      return 0;
    }
    const messages = get(
      db.query(Query.select(Filter.type(Message.Message)).from(feed).limit(NEW_MESSAGE_COUNT_WINDOW)).atom,
    );
    const stateMap = get(mailbox.messageState.atom);
    // Subscribe to viewed-state changes so the count re-derives when a conversation is opened.
    if (stateMap) {
      get(Obj.atom(stateMap));
    }
    const accessor = stateMap ? StateMap.bind<MessageState>(stateMap) : undefined;
    // Count distinct threads with at least one unread message; a message without a `threadId` is its
    // own conversation.
    const unreadThreads = new Set<string>();
    for (const message of messages) {
      if (!accessor || accessor.get(message.id).viewedAt === undefined) {
        unreadThreads.add(message.threadId ?? message.id);
      }
    }
    return unreadThreads.size;
  }),
);

//
// Tag application API.
//

/**
 * Finds an existing Gmail provider {@link Tag} object by its Gmail label-id foreign key, or creates
 * one carrying that key. Keeps the label in sync with Gmail's dictionary on re-sync.
 */
export const findOrCreateGmailTag = (
  db: Database.Database,
  { id, name }: { id: string; name: string },
): Promise<Tag.Tag> => Tag.findOrCreate(db, { key: { source: GMAIL_TAG_SOURCE, id }, label: name });

/**
 * Finds an existing JMAP provider {@link Tag} object by its JMAP mailbox-id foreign key, or creates
 * one carrying that key. Keeps the folder label in sync with the server on re-sync. Mirrors
 * {@link findOrCreateGmailTag}.
 */
export const findOrCreateJmapTag = (
  db: Database.Database,
  { id, name }: { id: string; name: string },
): Promise<Tag.Tag> => Tag.findOrCreate(db, { key: { source: JMAP_TAG_SOURCE, id }, label: name });

/** Returns the URI used to index a {@link Tag} object on a Mailbox. */
export const tagUri = (tag: Tag.Tag): string => Obj.getURI(tag).toString();

/**
 * Applies a user tag to a message by label. Finds-or-creates the {@link Tag} object (case-insensitive
 * label match), then indexes the message under the tag's URI. Idempotent. Returns the tag URI.
 */
export const applyTag = async (
  mailbox: Mailbox,
  { label, hue }: { label: string; hue?: string },
  message: Message.Message,
  db: Database.Database,
): Promise<string> => {
  const tag = await Tag.findOrCreate(db, { label, hue });
  const uri = tagUri(tag);
  Tagging.set(message, uri, { index: mailbox.tags.target });
  return uri;
};

/** Removes a tag from a message's index entry. No-op when not present. */
export const removeTag = (mailbox: Mailbox, uri: string, message: Message.Message): void => {
  Tagging.unset(message, uri, { index: mailbox.tags.target });
};

/**
 * Records the ids of objects extracted from a message under `mailbox.extracted[messageId]`.
 * Idempotent — duplicate ids are not appended. Used as the provenance association for feed-stored
 * messages (which cannot be ECHO relation endpoints).
 */
export const recordExtraction = (mailbox: Mailbox, messageId: string, objectIds: readonly string[]): void => {
  if (objectIds.length === 0) {
    return;
  }
  Obj.update(mailbox, (mailbox) => {
    const map = (mailbox.extracted ??= {});
    const merged = [...(map[messageId] ?? [])];
    for (const id of objectIds) {
      if (!merged.includes(id)) {
        merged.push(id);
      }
    }
    map[messageId] = merged;
  });
};

/** Returns the extracted-object ids recorded for a message (see {@link recordExtraction}). */
export const getExtractedObjectIds = (mailbox: Mailbox | Obj.Snapshot<Mailbox>, messageId: string): readonly string[] =>
  mailbox.extracted?.[messageId] ?? [];

/**
 * Inverts the tag index to a `messageId → tag uri[]` view-model.
 *
 * Cheaper than calling {@link getTagsForMessage} once per message — the caller iterates the map
 * once and indexes by message id. Labels/hues are resolved separately from the `Tag` objects (e.g.
 * via {@link Tagging.resolve}); UI surfaces look up the resolved `Tag` by uri.
 */
export const buildMessageTagsIndex = (mailbox: Mailbox | Obj.Snapshot<Mailbox>): Record<string, string[]> => {
  const index: Record<string, string[]> = {};
  const tagIndex = mailbox.tags.target;
  if (!tagIndex) {
    return index;
  }
  const tags = TagIndex.bind(tagIndex);
  for (const uri of tags.tagIds()) {
    for (const messageId of tags.objects(uri)) {
      (index[messageId] ??= []).push(uri);
    }
  }
  return index;
};

/**
 * A message as either a live database/queue object or an immutable snapshot (e.g. a feed message
 * resolved via `useObject`, which cannot be reconstituted to a live object). Components and hooks
 * that only read message fields (not mutate them) accept this instead of the live type.
 */
export type MessageLike = Message.Message | Obj.Snapshot<Message.Message>;

/** Returns the tag uris currently applied to a single message. */
export const getTagsForMessage = (mailbox: Mailbox, message: MessageLike): string[] =>
  Tagging.get(message, { index: mailbox.tags.target });
