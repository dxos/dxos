//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { BlueprintsAnnotation } from '@dxos/app-toolkit';
import { DXN, Annotation, Feed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { EchoURI, ObjectId } from '@dxos/keys';
import { FeedAnnotation } from '@dxos/schema';
import { Message } from '@dxos/types';

export const BLUEPRINT_KEY = 'org.dxos.blueprint.inbox';

// TODO(burdon): Implement as labels?
export enum MessageState {
  NONE = 0,
  ARCHIVED = 1,
  DELETED = 2,
  SPAM = 3,
}

/**
 * Per-mailbox tag entry. Carries the display attributes and an inverse index of which
 * messages are tagged. Replaces the older `Mailbox.labels` (Gmail provider dictionary) AND
 * the `HasSubject`-relation user-tagging path — one map for both.
 *
 * - `label`: display name. For provider-synced tags, the Gmail label name. For user tags,
 *   what the user typed.
 * - `hue`: optional Tailwind colour name (`red`, `amber`, `green`, …). See the canonical
 *   set in `@dxos/echo`'s `IconAnnotationSchema.hue` field.
 * - `source`: origin discriminator. Provider-synced tags use Gmail's label-id as the map
 *   key and shouldn't be renamed locally; user tags use a random `ObjectId` as the key
 *   and can be edited freely.
 * - `messages`: inverse index — `Ref<Message>` for each message tagged with this entry.
 *   Feed-stored Messages are immutable so the association lives here on the mutable Mailbox.
 */
export const Tag = Schema.Struct({
  label: Schema.String,
  hue: Schema.optional(Schema.String),
  source: Schema.optional(Schema.Literal('provider', 'user')),
  messages: Schema.Array(Ref.Ref(Message.Message)),
});

export interface Tag extends Schema.Schema.Type<typeof Tag> {}

/** Map of tag id → tag entry. See `Tag` for the tag-id strategy by `source`. */
export const Tags = Schema.Record({
  key: Schema.String,
  value: Tag,
});

export type Tags = Schema.Schema.Type<typeof Tags>;

/** Mailbox object schema. */
export const Mailbox = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  feed: Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false)),
  // Unified tag map covering both Gmail-synced provider labels (`source: 'provider'`,
  // keyed by Gmail's label-id) and user-applied tags (`source: 'user'`, keyed by ObjectId).
  // See `Tag` doc for the id-strategy rationale.
  tags: Tags.pipe(FormInputAnnotation.set(false), Schema.optional),
  // Provenance for extracted objects, keyed by message id → extracted object ids. Feed-stored
  // Messages are immutable Queue items and cannot be ECHO relation endpoints, so (like `tags`)
  // the association lives here on the mutable Mailbox. The referenced objects are space-db
  // objects resolved by id (`db.getObjectById`).
  extracted: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Array(Schema.String) })),
  // TODO(wittjosiah): Factor out to relation?
  filters: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      filter: Schema.String,
    }),
  ).pipe(FormInputAnnotation.set(false)),
  extractors: Schema.Struct({
    enabled: Schema.Array(Schema.String),
    threshold: Schema.Number.pipe(Schema.between(0, 1)),
  }).pipe(FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  Annotation.IconAnnotation.set({
    icon: 'ph--tray--regular',
    hue: 'rose',
  }),
  FeedAnnotation.set(true),
  BlueprintsAnnotation.set([BLUEPRINT_KEY]),
  Type.makeObject(DXN.make('org.dxos.type.mailbox', '0.1.0')),
);

export type Mailbox = Type.InstanceType<typeof Mailbox>;

/** Checks if a value is a Mailbox object. */
export const instanceOf = (value: unknown): value is Mailbox => Obj.instanceOf(Mailbox, value);

export const CreateMailboxSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
});

type MailboxProps = Omit<Obj.MakeProps<typeof Mailbox>, 'feed' | 'filters' | 'extractors'> & {
  filters?: { name: string; filter: string }[];
  extractors?: { enabled: string[]; threshold: number };
};

/** Creates a mailbox object with a backing feed. */
export const make = (props: MailboxProps = {}) => {
  const feed = Feed.make();
  const mailbox = Obj.make(Mailbox, {
    feed: Ref.make(feed),
    tags: {},
    filters: [],
    ...props,
  });

  // TODO(wittjosiah): Parent should be declarative in the schema.
  Obj.setParent(feed, mailbox);
  return mailbox;
};

//
// Tag application API.
//

/**
 * Finds an existing user tag entry by case-insensitive label match.
 * Returns the `[tagId, entry]` tuple, or `undefined` when no match.
 */
const findUserTagByLabel = (mailbox: Mailbox, label: string): [string, Tag] | undefined => {
  const lowered = label.toLowerCase();
  for (const [id, entry] of Object.entries(mailbox.tags ?? {})) {
    if (entry.source !== 'provider' && entry.label.toLowerCase() === lowered) {
      return [id, entry];
    }
  }
  return undefined;
};

const includesMessage = (entry: Tag, messageId: string): boolean =>
  entry.messages.some((ref) => Ref.isRef(ref) && refTargetsMessageId(ref, messageId));

const refTargetsMessageId = (ref: Ref.Ref<Message.Message>, messageId: string): boolean => {
  // Prefer the (cheap) loaded target id when present, otherwise fall back to decoding the
  // ref's URI — feed-stored objects may be ref'd before the target is resolved into the
  // working set.
  if (ref.target?.id === messageId) {
    return true;
  }
  try {
    const parsed = EchoURI.tryParse(ref.uri.toString());
    return parsed ? EchoURI.getObjectId(parsed) === messageId : false;
  } catch {
    return false;
  }
};

/**
 * Applies a tag to a message. Finds-or-creates the tag entry by case-insensitive label
 * match (among user tags). Idempotent — if the message is already in the tag's `messages`
 * array, no change. Returns the resolved tag id.
 *
 * For provider-synced tags (Gmail labels) callers should write directly to
 * `mailbox.tags[gmailLabelId]` so the Gmail-assigned id is preserved across syncs.
 */
export const applyTag = (
  mailbox: Mailbox,
  { label, hue }: { label: string; hue?: string },
  message: Message.Message,
): string => {
  const existing = findUserTagByLabel(mailbox, label);
  const tagId = existing?.[0] ?? ObjectId.random().toString();
  // Build the Ref outside `Obj.update` so we don't capture mid-transaction state.
  const ref = Ref.make(message);
  Obj.update(mailbox, (mailbox) => {
    const tags = (mailbox.tags ??= {});
    const entry = tags[tagId];
    if (!entry) {
      tags[tagId] = { label, ...(hue ? { hue } : {}), source: 'user', messages: [ref] };
      return;
    }
    if (!includesMessage(entry, message.id)) {
      entry.messages = [...entry.messages, ref];
    }
  });
  return tagId;
};

/** Removes a message from a tag's inverse index. No-op when not present. */
export const removeTag = (mailbox: Mailbox, tagId: string, message: Message.Message): void => {
  Obj.update(mailbox, (mailbox) => {
    const entry = mailbox.tags?.[tagId];
    if (!entry) {
      return;
    }
    entry.messages = entry.messages.filter((ref) => !Ref.isRef(ref) || !refTargetsMessageId(ref, message.id));
  });
};

/**
 * Resolves a `Ref<Message>` to its message id without requiring the target to be loaded.
 * Prefers the (cheap) loaded target id when present, otherwise decodes the ref's URI —
 * mirrors the lookup `refTargetsMessageId` uses so all three call sites (`includesMessage`,
 * `removeTag`, `buildMessageTagsIndex`) agree.
 */
const messageIdFromRef = (ref: Ref.Ref<Message.Message>): string | undefined => {
  if (ref.target?.id) {
    return ref.target.id;
  }
  try {
    const parsed = EchoURI.tryParse(ref.uri.toString());
    return parsed ? EchoURI.getObjectId(parsed) : undefined;
  } catch {
    return undefined;
  }
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
 * Inverts `mailbox.tags` to a `messageId → Tag[]` view-model.
 *
 * Cheaper than calling `getTagsForMessage` once per message — the caller iterates the map
 * once and indexes by message id. UI surfaces (`MessageStack` tiles, `MessageHeader`) use
 * this to render chips.
 */
export const buildMessageTagsIndex = (
  mailbox: Mailbox | Obj.Snapshot<Mailbox>,
): Record<string, Array<{ id: string } & Tag>> => {
  const index: Record<string, Array<{ id: string } & Tag>> = {};
  for (const [id, entry] of Object.entries(mailbox.tags ?? {})) {
    for (const ref of entry.messages) {
      if (!Ref.isRef(ref)) {
        continue;
      }
      const messageId = messageIdFromRef(ref);
      if (!messageId) {
        continue;
      }
      (index[messageId] ??= []).push({ id, ...entry });
    }
  }
  return index;
};

/** Returns the tag entries (id-augmented) currently applied to a single message. */
export const getTagsForMessage = (mailbox: Mailbox, message: Message.Message): Array<{ id: string } & Tag> => {
  const out: Array<{ id: string } & Tag> = [];
  for (const [id, entry] of Object.entries(mailbox.tags ?? {})) {
    if (includesMessage(entry, message.id)) {
      out.push({ id, ...entry });
    }
  }
  return out;
};
