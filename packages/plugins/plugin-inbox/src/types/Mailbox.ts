//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AppAnnotation } from '@dxos/app-toolkit';
import { DXN, Annotation, type Database, Feed, Obj, Ref, Tag, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';
import { FeedAnnotation, Tagging, TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

/**
 * Foreign-key source for Gmail provider labels. A Gmail label maps to a {@link Tag} object carrying
 * a foreign key `{ source: GMAIL_TAG_SOURCE, id: <gmail-label-id> }`; "provider" tags are those with
 * such a key, "user" tags are those without.
 */
export const GMAIL_TAG_SOURCE = 'com.google.gmail.label';

/**
 * Foreign-key source for JMAP provider folders (mailboxes). A JMAP mailbox maps to a {@link Tag}
 * object carrying a foreign key `{ source: JMAP_TAG_SOURCE, id: <jmap-mailbox-id> }`; mirrors
 * {@link GMAIL_TAG_SOURCE}.
 */
export const JMAP_TAG_SOURCE = 'org.ietf.jmap.mailbox';

export const SKILL_KEY = 'org.dxos.skill.inbox';

// TODO(burdon): Implement as labels?
export enum MessageState {
  NONE = 0,
  ARCHIVED = 1,
  DELETED = 2,
  SPAM = 3,
}

/** Mailbox object schema. */
export class Mailbox extends Type.makeObject<Mailbox>(DXN.make('org.dxos.type.mailbox', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    // ISO timestamp of when the mailbox was last viewed. Messages with a later `created` time are counted as new.
    viewedAt: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
    feed: Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false)),
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

/** Number of messages created after the mailbox was last viewed (see {@link markViewed}). */
export const getNewMessageCount = (
  mailbox: Mailbox | Obj.Snapshot<Mailbox>,
  messages: readonly Message.Message[],
): number => {
  const viewedAt = mailbox.viewedAt;
  if (!viewedAt) {
    return messages.length;
  }
  return messages.reduce((count, message) => (message.created > viewedAt ? count + 1 : count), 0);
};

/** Advances the `viewedAt` cursor to now, clearing the new-message count. */
export const markViewed = (mailbox: Mailbox): void => {
  const now = new Date().toISOString();
  Obj.update(mailbox, (mailbox) => {
    mailbox.viewedAt = now;
  });
};

export const CreateMailboxSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
});

type MailboxProps = Omit<Obj.MakeProps<typeof Mailbox>, 'feed' | 'tags' | 'filters' | 'extractors'> & {
  filters?: { name: string; filter: string }[];
  extractors?: { enabled: string[]; threshold: number };
};

/** Creates a mailbox object with a backing feed. */
export const make = (props: MailboxProps = {}) => {
  const feed = Feed.make();
  const tags = TagIndex.make();
  const mailbox = Obj.make(Mailbox, {
    feed: Ref.make(feed),
    tags: Ref.make(tags),
    filters: [],
    ...props,
  });

  // TODO(wittjosiah): Parent should be declarative in the schema.
  Obj.setParent(feed, mailbox);
  // Tag index is a child: cascade-deleted with the mailbox.
  Obj.setParent(tags, mailbox);
  return mailbox;
};

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

/** Returns the tag uris currently applied to a single message. */
export const getTagsForMessage = (mailbox: Mailbox, message: Message.Message): string[] =>
  Tagging.get(message, { index: mailbox.tags.target });
