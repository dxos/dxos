//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as Instructions from '@dxos/compute/Instructions';
import * as Skill from '@dxos/compute/Skill';
import { Annotation, type Database, DXN, Feed, Obj, Ref, Tag, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';
import * as ConnectorAnnotations from '@dxos/plugin-connector/ConnectorAnnotations';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { FeedAnnotation, Tagging, TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

export const SKILL_KEY = 'org.dxos.skill.inbox';

// TOOD(burdon): Factor out Message/Email utils with tests.

// TODO(burdon): Implement as labels?
export enum MessageState {
  NONE = 0,
  ARCHIVED = 1,
  DELETED = 2,
  SPAM = 3,
}

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

/** A bulk-mail subscription: a sender the user receives list mail from, with its unsubscribe target. */
export const Subscription = Schema.Struct({
  email: Schema.String,
  name: Schema.optional(Schema.String),
  /** The raw unsubscribe affordance: the `List-Unsubscribe` header value, or a link found in a body. */
  unsubscribe: Schema.String,
  /** Number of messages from this sender in the mailbox. */
  count: Schema.Number,
});
export interface Subscription extends Schema.Schema.Type<typeof Subscription> {}

/** Mailbox object schema. */
export class Mailbox extends Type.makeObject<Mailbox>(DXN.make('org.dxos.type.mailbox', '0.1.0'))(
  Schema.Struct({
    /** Display name; falls back to the bound account's address when absent. */
    name: Schema.String.pipe(Schema.optional),

    /** The durable message log. Every pipeline in `docs/PIPELINE.md` reads from (or writes to) this. */
    feed: Ref.Ref(Feed.Feed).pipe(Annotation.SetParent.set(true), FormInputAnnotation.set(false)),

    /**
     * Append-only feed of derived annotations about the messages in {@link feed} — summaries today
     * (see {@link makeSummary}), each a Message whose `parentMessage` names its subject.
     *
     * A second feed rather than a record on this object: annotations are immutable and unbounded, so
     * they belong in an append-only structure instead of growing the mailbox document, and
     * re-deriving one (better model, changed prompt) appends a new version rather than destroying the
     * old. The primary feed stays pure — no reader has to filter annotations out of the message list.
     * Provisioned lazily on first annotation, like {@link tags}.
     */
    annotations: Ref.Ref(Feed.Feed).pipe(
      Annotation.SetParent.set(true),
      FormInputAnnotation.set(false),
      Schema.optional,
    ),

    /**
     * Inverse tag index for immutable feed Messages: tag id (a `Tag` object's URI) → message ids.
     *
     * Messages are immutable Queue items, so their tag associations cannot live on the message and
     * live in a child `TagIndex` object instead (the `meta.tags` augmentation for feed objects). Tag
     * labels and hues live on the `Tag` objects themselves.
     */
    tags: Ref.Ref(TagIndex.TagIndex).pipe(Annotation.SetParent.set(true), FormInputAnnotation.set(false)),

    /**
     * Which contributed object extractors run over this mailbox, and the confidence a match must
     * clear before its result is kept.
     */
    extractors: Schema.Struct({
      enabled: Schema.Array(Schema.String),
      threshold: Schema.Number.pipe(Schema.check(Schema.isBetween({ minimum: 0, maximum: 1 }))),
    }).pipe(FormInputAnnotation.set(false), Schema.optional),

    /**
     * Provenance for extracted objects: message id → extracted object ids.
     *
     * Feed-stored Messages are immutable Queue items and cannot be ECHO relation endpoints, so — as
     * with {@link tags} — the association lives here on the mutable Mailbox. The referenced objects
     * are space-db objects resolved by id (`db.getObjectById`).
     */
    extracted: Schema.Record(Schema.String, Schema.Array(Schema.String)).pipe(
      FormInputAnnotation.set(false),
      Schema.optional,
    ),

    /**
     * SAVED VIEWS, shown as named children under the mailbox in the navtree. Each is a serialized
     * query string the user built in the filter bar and named (`SaveFilterPopover`); selecting one
     * scopes the list to it. Additive and presentational — a saved view narrows what you are LOOKING
     * at and never changes what the mailbox contains.
     *
     * Not to be confused with {@link messageFilters} below, which is the opposite in every respect.
     */
    // TODO(wittjosiah): Factor out to relation?
    filters: Schema.Array(Schema.Struct({ name: Schema.String, filter: Schema.String })).pipe(
      FormInputAnnotation.set(false),
    ),

    /**
     * EXCLUSION RULES (see {@link Filter}), honored across the UI, sync and analysis — a message
     * matching any of them is hidden everywhere, never committed to the feed, and never scanned by a
     * pipeline. This is the "ignore this sender" list, subtractive and global.
     *
     * The distinction from {@link filters} above: a saved view is a lens the user points at the
     * mailbox and can switch away from; an exclusion rule removes mail from the mailbox entirely, for
     * every surface and every pass, until the rule itself is deleted.
     */
    messageFilters: Schema.optional(Schema.Array(Filter)),

    /**
     * Optional per-mailbox reply guidance: tone, standing facts, sign-off, skills.
     *
     * A shared `Instructions` object can be referenced by several mailboxes, or a distinct one
     * created per mailbox; the reply generator merges its text and skills into the session prompt.
     */
    instructions: Ref.Ref(Instructions.Instructions).pipe(Schema.annotate({ title: 'Instructions' }), Schema.optional),

    /**
     * Bulk-mail subscriptions extracted from the feed by `ExtractSubscriptions`: one entry per sender
     * carrying an unsubscribe affordance (header or body link).
     *
     * Replaced wholesale each run — persisted derived state for the UI, never a source of truth,
     * which is why that pass must see every message and cannot take a feed cursor.
     */
    subscriptions: Schema.Array(Subscription).pipe(FormInputAnnotation.set(false), Schema.optional),
  }).pipe(
    FeedAnnotation.set({ property: 'feed' }),
    Annotation.IconAnnotation.set({ icon: 'ph--tray--regular', hue: 'rose' }),
    /**
     * Reading a mailbox is a chain: the message replaces the message plank rather than growing the
     * deck, and picking a different message drops the attachment that belonged to the last one.
     */
    AppAnnotation.DeckAnnotation.set({
      levels: [{ key: 'mailbox' }, { key: 'message' }, { key: 'attachment' }],
    }),
    Skill.SkillsAnnotation.set([SKILL_KEY]),
    /**
     * Offer "Connect" in the mailbox toolbar; bind the mailbox as the new connection's sync target.
     * Providers are resolved from the registry (any connector whose `sync.targetTypename` is this
     * type), so a mail provider registers itself rather than being named here.
     */
    ConnectorAnnotations.ConnectorAuthAnnotation.set({
      connectorIds: ConnectorSpec.idsForTarget,
      bindTarget: true,
    }),
  ),
) {}

/** Checks if a value is a Mailbox object. */
export const instanceOf = (value: unknown): value is Mailbox => Obj.instanceOf(Mailbox, value);

export const CreateMailboxSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotate({ title: 'Name' })),
});

type MailboxProps = Omit<Obj.MakeProps<typeof Mailbox>, 'feed' | 'tags' | 'filters' | 'extractors'> & {
  filters?: { name: string; filter: string }[];
  extractors?: { enabled: string[]; threshold: number };
};

/** Creates a mailbox object with a backing feed. */
export const make = (props: MailboxProps = {}) => {
  const feed = Feed.make();
  const tags = TagIndex.make();
  // The feed and tag index are children (`SetParent`): both cascade-delete with the mailbox.
  return Obj.make(Mailbox, {
    feed: Ref.make(feed),
    tags: Ref.make(tags),
    filters: [],
    ...props,
  });
};

//
// Tag application API.
//

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
    if (!mailbox.extracted) {
      mailbox.extracted = {};
    }
    // Re-read through the proxy: `??=` would evaluate to the plain right-hand object, and mutations
    // of a detached record are not written through, silently dropping the first recorded entry.
    const map = mailbox.extracted;
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

// A bare address, used to recognize a mailbox named after the account it syncs.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Best-effort addresses for the mailbox owner — the `me` input correspondence derivation needs to
 * tell outbound from inbound. The connectors seed `mailbox.name` from the connection's
 * `accessToken.account`, so a synced mailbox usually names its own account. Anything else yields
 * none: callers report the dependent stage as skipped rather than deriving against a wrong identity,
 * which would silently invert every sent/received judgement.
 */
export const identityAddresses = (mailbox: Pick<Mailbox, 'name'>): string[] => {
  const name = mailbox.name?.trim().toLowerCase();
  return name && EMAIL_RE.test(name) ? [name] : [];
};

//
// Annotations (the `annotations` feed).
//

/**
 * Builds a summary of `message` as an immutable annotation Message: `parentMessage` names its
 * subject and the text block carries `disposition: 'summary'`. Append to the mailbox's
 * {@link Mailbox.annotations} feed; re-deriving appends a newer one rather than mutating this.
 */
export const makeSummary = ({
  message,
  text,
  model,
  created = new Date().toISOString(),
}: {
  message: Pick<MessageLike, 'id'>;
  text: string;
  /** Model that produced the summary, recorded so a re-derivation is attributable. */
  model?: string;
  created?: string;
}): Message.Message =>
  Message.make({
    parentMessage: message.id,
    created,
    sender: {},
    // Markdown, not plain: generated summaries may carry inline emphasis or links, and the text-block
    // renderers select the markdown view over the plaintext one.
    blocks: [{ _tag: 'text', text, disposition: 'summary', mimeType: 'text/markdown' }],
    properties: model ? { model } : undefined,
  });

/**
 * The mailbox's annotation feed, provisioned on first use — annotations are rare relative to
 * mailboxes, so the feed is not created until something derives one (the {@link Mailbox.tags} pattern).
 */
export const findOrCreateAnnotations = (mailbox: Mailbox, db: Pick<Database.Database, 'add'>): Feed.Feed => {
  const existing = mailbox.annotations?.target;
  if (existing) {
    return existing;
  }

  const feed = db.add(Feed.make());
  Obj.update(mailbox, (mailbox) => {
    mailbox.annotations = Ref.make(feed);
  });

  return feed;
};

/** The summary text carried by an annotation message, if it is one. */
export const getSummaryText = (annotation: MessageLike): string | undefined => {
  // A loop, not `find`: the discriminant only narrows the block union inside the `if`.
  for (const block of annotation.blocks ?? []) {
    if (block._tag === 'text' && block.disposition === 'summary') {
      return block.text;
    }
  }
  return undefined;
};

/**
 * Newest summary per source message, keyed by message id — the read model for UI that renders
 * summaries beside messages it already has (the article), where the full {@link mergeAnnotations}
 * pairing would mean re-walking the message feed.
 */
export const summaryIndex = (annotations: Iterable<MessageLike>): Map<string, string> => {
  const newest = new Map<string, MessageLike>();
  for (const annotation of annotations) {
    const parent = annotation.parentMessage;
    if (!parent || getSummaryText(annotation) === undefined) {
      continue;
    }
    const current = newest.get(parent);
    if (!current || Date.parse(annotation.created) > Date.parse(current.created)) {
      newest.set(parent, annotation);
    }
  }

  const index = new Map<string, string>();
  for (const [parent, annotation] of newest) {
    const summary = getSummaryText(annotation);
    if (summary !== undefined) {
      index.set(parent, summary);
    }
  }
  return index;
};

/** A conversation's summary and its provenance, so the UI can attribute and date it. */
export type ConversationSummary = {
  readonly summary: string;
  /** Message the summary was derived from. */
  readonly messageId: string;
  /** Model that produced it, when the annotation recorded one. */
  readonly model?: string;
  /** When it was derived — NOT the message's date, so a stale summary reads as stale. */
  readonly created: string;
};

/**
 * The summary shown for a whole conversation: the newest annotation naming any message in the thread.
 * `SummarizeMailbox` files one summary per thread under its newest message, so this normally resolves
 * to that annotation — and to the most recent one when a re-derivation has superseded it.
 *
 * Takes the annotations rather than a {@link summaryIndex} map because provenance (`model`, `created`)
 * lives on the annotation Message, which the map discards.
 */
export const conversationSummary = (
  messages: Iterable<Pick<Message.Message, 'id'>>,
  annotations: Iterable<MessageLike>,
): ConversationSummary | undefined => {
  const ids = new Set<string>();
  for (const message of messages) {
    ids.add(message.id);
  }

  // The summary text and parent id are captured in the loop, where they are known to be present —
  // narrowing them again afterwards would need non-null assertions.
  let newest: ConversationSummary | undefined;
  for (const annotation of annotations) {
    const parent = annotation.parentMessage;
    const summary = getSummaryText(annotation);
    if (!parent || !ids.has(parent) || summary === undefined) {
      continue;
    }
    if (newest && Date.parse(annotation.created) <= Date.parse(newest.created)) {
      continue;
    }

    const model = annotation.properties?.model;
    newest = {
      summary,
      messageId: parent,
      ...(typeof model === 'string' ? { model } : {}),
      created: annotation.created,
    };
  }
  return newest;
};

/** A feed message paired with the annotations derived from it. */
export type AnnotatedMessage = {
  readonly message: Message.Message;
  /** Newest summary for this message, when one has been derived. */
  readonly summary?: string;
  /** Every annotation naming this message, newest first. */
  readonly annotations: readonly MessageLike[];
};

/**
 * Merges the mailbox's message feed with its annotation feed, yielding each message with whatever
 * has been derived about it. Iterates the message feed in its own order — annotations never add,
 * remove or reorder messages — and indexes the annotations once, so the merge stays linear.
 *
 * Annotations are grouped by `parentMessage` and ordered newest-first, so a re-derived summary
 * supersedes the earlier one while both remain in the feed.
 */
export function* mergeAnnotations(
  messages: Iterable<Message.Message>,
  annotations: Iterable<MessageLike>,
): Generator<AnnotatedMessage> {
  const byParent = new Map<string, MessageLike[]>();
  for (const annotation of annotations) {
    const parent = annotation.parentMessage;
    if (!parent) {
      continue;
    }
    const list = byParent.get(parent);
    if (list) {
      list.push(annotation);
    } else {
      byParent.set(parent, [annotation]);
    }
  }

  for (const list of byParent.values()) {
    list.sort((left, right) => Date.parse(right.created) - Date.parse(left.created));
  }

  for (const message of messages) {
    const derived = byParent.get(message.id) ?? [];
    const summary = derived.map(getSummaryText).find((text) => text !== undefined);
    yield { message, summary, annotations: derived };
  }
}

/** The `List-Unsubscribe` target on a message (the machine-actionable unsubscribe affordance), if any. */
export const getUnsubscribeTarget = (message: MessageLike): string | undefined => {
  const value = message.properties?.listUnsubscribe;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

/**
 * Parse an unsubscribe affordance — an RFC 2369 `List-Unsubscribe` header (`<https://…>, <mailto:…>`)
 * or a bare URL (a body-extracted link) — into its one-click HTTP and mailto targets. The HTTP form
 * supports RFC 8058 one-click POST; the mailto is the fallback. Pure.
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

  // A body-extracted affordance is a bare URL with no angle brackets.
  const bare = header.trim();
  if (!targets.http && !targets.mailto) {
    if (/^https?:/i.test(bare)) {
      targets.http = bare;
    } else if (/^mailto:/i.test(bare)) {
      targets.mailto = bare;
    }
  }

  return targets;
};

// Unsubscribe-shaped URLs in message bodies — the affordance bulk senders put in the footer when
// the transport header is absent (or was stripped by a forward).
const BODY_UNSUBSCRIBE_RE =
  /https?:\/\/[^\s()[\]"<>]*(?:unsubscrib|opt[-_]?out|email[-_]?preferences|manage[-_]?preferences)[^\s()[\]"<>]*/i;

/** The first unsubscribe-shaped link in the message's text blocks, if any. Pure. */
export const extractBodyUnsubscribe = (message: MessageLike): string | undefined => {
  for (const block of message.blocks ?? []) {
    if (block._tag !== 'text') {
      continue;
    }
    const match = block.text?.match(BODY_UNSUBSCRIBE_RE);
    if (match) {
      return match[0];
    }
  }
  return undefined;
};

/** The message's unsubscribe affordance from any source: the header, falling back to a body link. */
export const getUnsubscribeAffordance = (message: MessageLike): string | undefined =>
  getUnsubscribeTarget(message) ?? extractBodyUnsubscribe(message);

/**
 * Group the mailbox's messages into subscriptions — one per sender carrying an unsubscribe
 * affordance — for the Subscriptions view. Sorted by message count (noisiest first). Pure. The
 * default resolver reads only the header; pass {@link getUnsubscribeAffordance} to include body
 * links (the extraction pipeline does).
 */
export const deriveSubscriptions = (
  messages: readonly MessageLike[],
  getTarget: (message: MessageLike) => string | undefined = getUnsubscribeTarget,
): Subscription[] => {
  const byEmail = new Map<string, { email: string; name?: string; unsubscribe: string; count: number }>();
  for (const message of messages) {
    const target = getTarget(message);
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

  // Count ties break alphabetically (then by email, so case-insensitively equal names stay
  // deterministic): Map insertion order follows message order, which is unstable across syncs and
  // reads as an unsorted list.
  return [...byEmail.values()].sort(
    (left, right) =>
      right.count - left.count ||
      (left.name ?? left.email).localeCompare(right.name ?? right.email, undefined, { sensitivity: 'base' }) ||
      left.email.localeCompare(right.email),
  );
};
