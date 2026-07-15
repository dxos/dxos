//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AppAnnotation } from '@dxos/app-toolkit';
import { Instructions } from '@dxos/compute';
import { Annotation, type Database, DXN, Feed, Obj, Ref, Tag, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';
import { ConnectorAuthAnnotation } from '@dxos/plugin-connector';
import { FeedAnnotation, Tagging, TagIndex } from '@dxos/schema';
import { Message, Topic } from '@dxos/types';

import { GMAIL_CONNECTOR_ID, JMAP_MAIL_CONNECTOR_ID } from '../constants';

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
export enum MessageState {
  NONE = 0,
  ARCHIVED = 1,
  DELETED = 2,
  SPAM = 3,
}

/** Mailbox object schema. */
/**
 * A message filter — an exclusion rule applied across the mailbox UI, sync, and analysis. Kept
 * intentionally small; expected to grow (subject, labels, date, …), so match logic lives in the
 * {@link matchesFilter} / {@link isFiltered} helpers rather than at call sites.
 */
export const Filter = Schema.Struct({
  /** Regex (case-insensitive) matched against the sender email; a message matches when its sender does. */
  from: Schema.optional(Schema.String),
});
export interface Filter extends Schema.Schema.Type<typeof Filter> {}

export class Mailbox extends Type.makeObject<Mailbox>(DXN.make('org.dxos.type.mailbox', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    feed: Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false)),
    // Inverse tag index for immutable feed Messages: tag id (a `Tag` object's URI) → message ids.
    // Messages are immutable Queue items, so their tag associations live in a child `TagIndex` object
    // (the `meta.tags` augmentation for feed objects). Tag labels/hues live on the `Tag` objects.
    tags: Ref.Ref(TagIndex.TagIndex).pipe(FormInputAnnotation.set(false)),
    extractors: Schema.Struct({
      enabled: Schema.Array(Schema.String),
      threshold: Schema.Number.pipe(Schema.between(0, 1)),
    }).pipe(FormInputAnnotation.set(false), Schema.optional),
    // Exclusion filters (see {@link Filter}) honored across the UI, sync, and analysis — messages
    // matching any filter are hidden and never committed / enriched.
    messageFilters: Schema.optional(Schema.Array(Filter)),
    // Optional per-mailbox reply guidance (tone, standing facts, sign-off, skills). A shared
    // `Instructions` object can be referenced by several mailboxes, or a distinct one created per
    // mailbox; the reply generator merges its text + skills into the session prompt.
    instructions: Ref.Ref(Instructions.Instructions).pipe(
      Schema.annotations({ title: 'Instructions' }),
      Schema.optional,
    ),
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
    // Proposed topics the user has not yet accepted (see {@link Topic.Props}). `AnalyzeTopics` writes
    // these instead of materializing `Topic` objects; accepting one promotes it via `Obj.make(Topic, …)`.
    topicSuggestions: Schema.optional(Schema.Array(Topic.Props)),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--tray--regular', hue: 'rose' }),
    FeedAnnotation.set(true),
    AppAnnotation.SkillsAnnotation.set([SKILL_KEY]),
    // Offer "Connect" in the mailbox toolbar; bind the mailbox as the new connection's sync target.
    ConnectorAuthAnnotation.set({ connectorIds: [GMAIL_CONNECTOR_ID, JMAP_MAIL_CONNECTOR_ID], bindTarget: true }),
  ),
) {}

/** Checks if a value is a Mailbox object. */
export const instanceOf = (value: unknown): value is Mailbox => Obj.instanceOf(Mailbox, value);

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

/**
 * A message as either a live database/queue object or an immutable snapshot (e.g. a feed message
 * resolved via `useObject`, which cannot be reconstituted to a live object). Components and hooks
 * that only read message fields (not mutate them) accept this instead of the live type.
 */
export type MessageLike = Message.Message | Obj.Snapshot<Message.Message>;

/** Returns the tag uris currently applied to a single message. */
export const getTagsForMessage = (mailbox: Mailbox, message: MessageLike): string[] =>
  Tagging.get(message, { index: mailbox.tags.target });

// Local-part patterns for senders that don't accept replies (transactional / bulk mail).
const NO_REPLY_RE = /(^|[._+-])(no-?reply|do-?not-?reply|donotreply|noreply|mailer-daemon)([._+-]|$)/i;

/** Whether an email address is a no-reply / do-not-reply / mailer-daemon sender. */
export const isNoReplyAddress = (email: string | undefined): boolean =>
  !!email && NO_REPLY_RE.test(email.split('@')[0] ?? '');

/** Minimal message shape a {@link Filter} matches against (satisfied by a live message or a snapshot). */
type Filterable = { readonly sender?: { readonly email?: string } };

/**
 * Whether a single filter matches a message. Currently sender-only: the `from` regex is tested
 * (case-insensitive) against the sender email, falling back to a literal substring match when the
 * pattern is not a valid regex. Grows here as {@link Filter} gains fields.
 */
export const matchesFilter = (filter: Filter, message: Filterable): boolean => {
  if (filter.from) {
    const email = message.sender?.email ?? '';
    if (email.length === 0) {
      return false;
    }
    try {
      return new RegExp(filter.from, 'i').test(email);
    } catch {
      return email.toLowerCase().includes(filter.from.toLowerCase());
    }
  }
  return false;
};

/** Whether a message is excluded by any of the mailbox's filters (hidden from the UI, sync, analysis). */
export const isFiltered = (mailbox: Pick<Mailbox, 'messageFilters'>, message: Filterable): boolean =>
  (mailbox.messageFilters ?? []).some((filter) => matchesFilter(filter, message));

/** Adds a sender-exclusion filter for `email` (idempotent — no-op if already ignored). */
export const ignoreSender = (mailbox: Mailbox, email: string): void => {
  if (email.length === 0 || (mailbox.messageFilters ?? []).some((filter) => filter.from === email)) {
    return;
  }
  Obj.update(mailbox, (mailbox) => {
    (mailbox.messageFilters ??= []).push({ from: email });
  });
};

// Local-part patterns for role / automated mailboxes — an organization, not an individual (support,
// billing, notifications, …). A leading role word, optionally followed by a separator (`support`,
// `billing+eu`, `no.reply`).
const ROLE_LOCALPART_RE =
  /^(support|help(desk)?|info|hello|contact|team|sales|billing|invoices?|receipts?|payments?|accounts?|admin|postmaster|mailer|marketing|promo(tions)?|offers|deals|careers?|jobs|feedback|survey|orders?|shipping|service|members?|membership|community|digest|notifications?|notify|alerts?|updates?|news(letter)?|security|welcome|webmaster)([._+-]|$)/i;

// Display-name markers that signal an organizational sender rather than a person.
const ORG_NAME_RE = /\b(inc|llc|ltd|gmbh|corp|team|support|notifications?|newsletter|billing|no-?reply)\b/i;

/**
 * Whether a sender is an organization / automated role mailbox rather than an individual — a
 * strong-signal, deterministic check (a role local part or an org-shaped display name). Deliberately
 * conservative: it errs toward `false` (treat as a person) so a genuine individual is never wrongly
 * excluded from replies. The richer, confidence-scored person/org triage lives in the research
 * harness; this is the cheap foreground gate {@link isReplyable} needs.
 */
export const isOrgSender = (message: MessageLike): boolean => {
  const localPart = (message.sender?.email ?? '').split('@')[0] ?? '';
  if (localPart && ROLE_LOCALPART_RE.test(localPart)) {
    return true;
  }
  const name = message.sender?.name;
  return !!name && ORG_NAME_RE.test(name);
};

/**
 * Whether a message is worth drafting a reply to. Replies go only to people: bulk/automated mail — a
 * no-reply sender, an unsubscribe affordance, or an organizational / role sender — is skipped. Reads
 * the signals the Gmail sync mapper records on `properties` (`noReply`, `listUnsubscribe`), falling
 * back to the sender address for messages mapped before those signals existed (e.g. an older
 * fixture). When the caller has a classified sender type (e.g. the background classify-sender stage),
 * pass `senderClass` to use it instead of the heuristic.
 */
export const isReplyable = (message: MessageLike, options: { senderClass?: 'person' | 'org' } = {}): boolean => {
  const properties = message.properties ?? {};
  const hasUnsubscribe = typeof properties.listUnsubscribe === 'string' && properties.listUnsubscribe.length > 0;
  if (properties.noReply === true || hasUnsubscribe || isNoReplyAddress(message.sender?.email)) {
    return false;
  }
  // A classified type (from the LLM stage) wins over the heuristic; otherwise fall back to it.
  return options.senderClass ? options.senderClass === 'person' : !isOrgSender(message);
};

/** The `List-Unsubscribe` target on a message (the machine-actionable unsubscribe affordance), if any. */
export const getUnsubscribeTarget = (message: MessageLike): string | undefined => {
  const value = message.properties?.listUnsubscribe;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

/**
 * Parse an RFC 2369 `List-Unsubscribe` header (`<https://…>, <mailto:…>`) into its one-click HTTP and
 * mailto targets. The HTTP form supports RFC 8058 one-click POST; the mailto is the fallback. Pure.
 */
export const parseUnsubscribe = (header: string): { http?: string; mailto?: string } => {
  const targets: { http?: string; mailto?: string } = {};
  for (const match of header.matchAll(/<([^>]+)>/g)) {
    const url = match[1].trim();
    if (/^https?:/i.test(url) && !targets.http) {
      targets.http = url;
    } else if (/^mailto:/i.test(url) && !targets.mailto) {
      targets.mailto = url;
    }
  }
  return targets;
};

/** A bulk-mail subscription: a sender the user receives list mail from, with its unsubscribe target. */
export type Subscription = {
  readonly email: string;
  readonly name?: string;
  /** The raw `List-Unsubscribe` header value. */
  readonly unsubscribe: string;
  /** Number of messages from this sender in the mailbox. */
  readonly count: number;
};

/**
 * Group the mailbox's messages into subscriptions — one per sender carrying a `List-Unsubscribe`
 * affordance — for the Subscriptions view. Sorted by message count (noisiest first). Pure.
 */
export const deriveSubscriptions = (messages: readonly MessageLike[]): Subscription[] => {
  const byEmail = new Map<string, { email: string; name?: string; unsubscribe: string; count: number }>();
  for (const message of messages) {
    const target = getUnsubscribeTarget(message);
    const email = message.sender?.email?.toLowerCase();
    if (!target || !email) {
      continue;
    }
    const existing = byEmail.get(email);
    if (existing) {
      existing.count += 1;
    } else {
      byEmail.set(email, { email, name: message.sender?.name, unsubscribe: target, count: 1 });
    }
  }
  return [...byEmail.values()].sort((left, right) => right.count - left.count);
};
