//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Blob, Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { type ContactLookup, buildContactFromActor, buildContactLookup } from '@dxos/extractor-lib';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { normalizeText } from '@dxos/markdown';
import { Stage } from '@dxos/pipeline';
import { Tagging, TagIndex } from '@dxos/schema';
import { DraftMessage, Message, Person } from '@dxos/types';

// TODO(burdon): Factor out.

/**
 * Reusable, generic email-processing pipeline stages: Mapped → Mapped, composing in any order, each
 * simply recording what it found (`message.attachments`, `contact`, …) rather than writing directly.
 * {@link toCommitUnit} is the terminal stage that turns those into a generic `Cursor.CommitUnit`, and
 * must run last. Provider-specific decode/map stages stay in each sync op.
 */

/** An item carrying a body string that may contain HTML. */
export type Bodied = { readonly body: string };

/**
 * Normalizes an item's `body` from (possibly) HTML into markdown via `normalizeText` (turndown when
 * HTML, passthrough for plaintext). Requires nothing from the Requirements channel. Written as a
 * generic pipeable so the item type infers from the upstream stream (no type argument needed).
 */
export const htmlToMarkdown = <In extends Bodied, E, R>(self: Stream.Stream<In, E, R>): Stream.Stream<In, E, R> =>
  Stage.map('html-to-markdown', (item: In) => Effect.sync(() => ({ ...item, body: normalizeText(item.body) })))(self);

/**
 * A mapped message flowing through the generic email stages (attachments, contact extraction, …) —
 * each is Mapped → Mapped, so they compose in any order, simply recording what they found
 * (`message.attachments`, `contact`) rather than each building its own deferred write.
 * {@link toCommitUnit} is the stage that turns those into a `Cursor.CommitUnit`'s `commitEffects`,
 * and must run last.
 */
export type Mapped = {
  readonly message: Message.Message;
  readonly foreignId: string;
  readonly key: number;
  /** Provider label/folder tag URIs to apply on commit; omit for providers/stages that don't tag. */
  readonly tagUris?: readonly string[];
  /** Attachments fetched by a provider-specific stage upstream of {@link processAttachments}. */
  readonly attachments?: readonly Attachment[];
  /** Contact resolved by {@link extractContacts}, added to the database by {@link toCommitUnit}. */
  readonly contact?: Person.Person;
  /** Local drafts this synced message supersedes ({@link reconcileDrafts}), removed by {@link toCommitUnit}. */
  readonly supersededDrafts?: readonly Message.Message[];
};

/**
 * A new message to append (the full {@link Mapped} payload, tagged `upsert`). The body stages act only
 * on this variant of {@link Change}.
 */
export type Upsert = { readonly _tag: 'upsert' } & Mapped;

/**
 * A label change on an already-committed message, resolved to its feed message's `entityId`.
 * {@link toCommitUnit} turns it into an objectless commit unit that applies the tag adds/removes — no
 * feed append, so the body stages ({@link processAttachments}, {@link extractContacts},
 * {@link reconcileDrafts}) pass it through untouched.
 */
export type Retag = {
  readonly _tag: 'retag';
  readonly foreignId: string;
  readonly entityId: Obj.ID;
  readonly addTagIds: readonly string[];
  readonly removeTagIds: readonly string[];
};

/**
 * A remote deletion of an already-committed message. Wired but STUBBED — {@link toCommitUnit} emits an
 * objectless unit with no effect (see the TODO there) pending safe in-sync feed object deletion.
 */
export type Delete = {
  readonly _tag: 'delete';
  readonly foreignId: string;
  readonly entityId: Obj.ID;
};

/**
 * The discriminated item flowing through the shared email tail. `upsert` is a new message; `retag`/
 * `delete` act on existing feed messages by `entityId`. All converge on the single {@link toCommitUnit}
 * → `Cursor.commit`.
 */
export type Change = Upsert | Retag | Delete;

/** Wraps a decoded {@link Mapped} as an `upsert` {@link Change}. */
export const upsert = (mapped: Mapped): Upsert => ({ _tag: 'upsert', ...mapped });

/** A decoded email attachment, ready for {@link processAttachments} to turn into a Blob. */
export type Attachment = {
  readonly name?: string;
  readonly mimeType?: string;
  readonly size: number;
  readonly bytes: Uint8Array;
  /** The attachment's `Content-ID`, if any — matches a `cid:` reference in the message's HTML body. */
  readonly contentId?: string;
};

/**
 * Builds a Person (+ Organization link by domain) from the message sender and records it on the
 * item as {@link Mapped.contact} — the stage writes nothing itself; {@link toCommitUnit} defers
 * the actual `db.add` to commit. A stage factory: call it once per pipeline run so its
 * {@link ContactLookup} is scoped to that run.
 *
 * Dedups against both the space (contacts present before the run) and contacts created earlier in the
 * same run (the lookup is maintained as each is built, since a not-yet-committed contact wouldn't show
 * in a fresh query), so a repeat sender never yields a duplicate Person.
 */
export const extractContacts = (): Stage.Stage<Change, Change, never, Database.Service> => {
  // Run-scoped contact/org lookup, seeded once on the first item and maintained by
  // `buildContactFromActor` as it creates contacts. Without it, each message re-queried every Person
  // and Organization in the space (O(#contacts) per message → O(n²) over a large sync) — the dominant
  // upstream cost measured in profiling.
  let lookup: ContactLookup | undefined;
  return Stage.map('extract-contacts', (change: Change) =>
    Effect.gen(function* () {
      // Only new messages carry a body/sender; retag/delete pass through untouched.
      if (change._tag !== 'upsert') {
        return change;
      }
      const { db } = yield* Database.Service;
      if (!lookup) {
        lookup = yield* buildContactLookup(db);
      }
      const sender = change.message.sender;
      const contact = sender ? yield* buildContactFromActor(sender, db, lookup) : undefined;
      return contact ? { ...change, contact } : change;
    }),
  );
};

/**
 * Turns each of the item's `attachments` into a Blob object (via the database's configured storage
 * backend — edge in Composer) and adds a {@link Message.Attachment} pointing at it to the message.
 * {@link toCommitUnit} finds these blobs again via each attachment's ref (inlined, since the
 * blob isn't attached to a database yet) to defer their feed append to commit. A no-op when the item
 * has no attachments.
 *
 * One bad or oversized attachment must not fail the whole message: each `Blob.fromBytes` is caught
 * and logged individually, so a rejected attachment is simply dropped from the message.
 */
export const processAttachments = (): Stage.Stage<Change, Change, never, Database.Service> =>
  Stage.map('process-attachments', (change: Change) =>
    Effect.gen(function* () {
      // Only new messages carry attachments; retag/delete pass through untouched.
      if (change._tag !== 'upsert') {
        return change;
      }
      const mapped = change;
      if (!mapped.attachments?.length) {
        return mapped;
      }

      const attachments: Message.Attachment[] = [];
      for (const attachment of mapped.attachments) {
        const blob: Blob.Blob | undefined = yield* Blob.fromBytes(attachment.bytes, {
          type: attachment.mimeType,
        }).pipe(
          Effect.catchAll((error) => {
            log.catch(error, { foreignId: mapped.foreignId, name: attachment.name, size: attachment.size });
            return Effect.succeed(undefined);
          }),
        );
        if (!blob) {
          continue;
        }
        attachments.push({ name: attachment.name, ref: Ref.make(blob), contentId: attachment.contentId });
      }
      if (attachments.length === 0) {
        return mapped;
      }

      // The message is not yet appended to the feed, so mutating it here is safe — mirrors how the
      // mappers assemble `blocks` before the message is ever persisted.
      Obj.update(mapped.message, (message) => {
        message.attachments = [...(message.attachments ?? []), ...attachments];
      });

      return mapped;
    }),
  );

/**
 * Queries the parent container's already-sent drafts once per sync run and pools them by the provider
 * message id captured at send time (`properties.sentMessageId`) — the key {@link reconcileDrafts}
 * matches each incoming message's `foreignId` against. Doing this once (rather than per item) keeps
 * reconciliation off the database as messages stream through. Unsent drafts (no `sentMessageId`) are
 * never pooled and thus never eligible for removal.
 *
 * `parent` is the local root object drafts are scoped to (e.g. a Mailbox) — only its URI is read, so
 * any object works.
 */
export const queryDraftPool = Effect.fn('queryDraftPool')(function* (parent: Obj.Unknown) {
  const parentUri = Obj.getURI(parent);
  const drafts = (yield* Database.query(Filter.type(Message.Message, { properties: { mailbox: parentUri } }))
    .run).filter((candidate) => DraftMessage.belongsTo(candidate, parentUri) && candidate.properties?.sentMessageId);

  const pool = new Map<string, Message.Message[]>();
  for (const draft of drafts) {
    const sentMessageId = draft.properties?.sentMessageId;
    if (!sentMessageId) {
      continue;
    }
    const existing = pool.get(sentMessageId);
    if (existing) {
      existing.push(draft);
    } else {
      pool.set(sentMessageId, [draft]);
    }
  }
  return pool;
});

/**
 * Records the local drafts each incoming message supersedes — matched by the provider message id the
 * draft captured at send time (`properties.sentMessageId`), which equals the synced message's
 * `foreignId` — from a pool built once per run and keyed by that id. Writes nothing itself;
 * {@link toCommitUnit} defers the `db.remove` to commit, so the canonical message is appended
 * to the feed before its now-redundant drafts are deleted. A stage factory: pass the run's draft
 * pool once.
 *
 * The pool is queried a single time by the caller (per sync operation), so this stage never touches
 * the database or feed per item.
 */
export const reconcileDrafts = (
  draftPool: ReadonlyMap<string, readonly Message.Message[]>,
): Stage.Stage<Change, Change, never, never> =>
  Stage.map('reconcile-drafts', (change: Change) =>
    Effect.sync(() => {
      // Only new messages can supersede a draft; retag/delete pass through untouched.
      if (change._tag !== 'upsert') {
        return change;
      }
      const drafts = draftPool.get(change.foreignId);
      return drafts?.length ? { ...change, supersededDrafts: drafts } : change;
    }),
  );

/**
 * Terminal stage converting a run's {@link Mapped} item into the generic `Cursor.CommitUnit` the
 * commit sink consumes: `message.attachments` (populated by {@link processAttachments}) becomes a
 * feed-append commit effect for the referenced blobs, `mapped.contact` (from {@link extractContacts})
 * becomes a `db.add` commit effect, and `mapped.supersededDrafts` (from {@link reconcileDrafts})
 * becomes a `db.remove` commit effect. Every other email stage is Mapped → Mapped and composes in
 * any order; this is the one stage that must run last.
 *
 * Tagging is email-specific (`Cursor.CommitUnit` carries no tag data), so it's applied here rather
 * than by the generic commit sink: `tagIndex` is optional (omit for providers/tests that don't tag),
 * and every tagged unit attaches the *same* `applyTags` closure (keyed by `mapped.tagUris` recorded in
 * a run-scoped map, read back by object identity) so the commit's identity-based batching applies
 * every tag pair for the page in one `Tagging.setBatch` call rather than one per message.
 */
export const toCommitUnit = (
  options: { readonly tagIndex?: TagIndex.TagIndex } = {},
): Stage.Stage<Change, Cursor.CommitUnit, never, Cursor.Service> => {
  const { tagIndex } = options;
  const tagUrisByObject = new WeakMap<Obj.Any, readonly string[]>();
  const applyTags: Cursor.CommitEffect = Effect.fn('email.commit.tags')(function* (
    units: readonly Cursor.CommitUnit[],
  ) {
    if (!tagIndex) {
      return;
    }
    const tagEntries: { object: Obj.Any; tagId: string }[] = [];
    for (const unit of units) {
      if (!unit.object) {
        continue;
      }
      for (const uri of tagUrisByObject.get(unit.object) ?? []) {
        tagEntries.push({ object: unit.object, tagId: uri });
      }
    }
    if (tagEntries.length > 0) {
      Tagging.setBatch(tagEntries, { index: tagIndex });
    }
  });

  // Retag adds/removes recorded per foreign id, applied in one shared effect (identity-batched by the
  // commit) so a page of label changes resolves to a single pass over the tag index.
  const retagByForeignId = new Map<string, Pick<Retag, 'entityId' | 'addTagIds' | 'removeTagIds'>>();
  const applyRetags: Cursor.CommitEffect = Effect.fn('email.commit.retags')(function* (
    units: readonly Cursor.CommitUnit[],
  ) {
    if (!tagIndex) {
      return;
    }
    const accessor = TagIndex.bind(tagIndex);
    for (const unit of units) {
      const retag = retagByForeignId.get(unit.foreignId);
      if (!retag) {
        continue;
      }
      for (const tagId of retag.addTagIds) {
        accessor.setTag(tagId, retag.entityId);
      }
      for (const tagId of retag.removeTagIds) {
        accessor.unsetTag(tagId, retag.entityId);
      }
    }
  });

  return Stage.map('to-commit-unit', (change: Change) =>
    Effect.gen(function* () {
      // Label change on an existing message: an objectless unit (no feed append, key 0) whose effect
      // retags by entityId.
      if (change._tag === 'retag') {
        retagByForeignId.set(change.foreignId, {
          entityId: change.entityId,
          addTagIds: change.addTagIds,
          removeTagIds: change.removeTagIds,
        });
        return {
          foreignId: change.foreignId,
          key: 0,
          commitEffects: tagIndex ? [applyRetags] : undefined,
        } satisfies Cursor.CommitUnit;
      }

      // Remote deletion: wired but STUBBED — the branch resolves an objectless unit that does nothing.
      // TODO(wittjosiah): Remove the message from the feed once in-sync feed object deletion is safe
      //   (cursor/dedup-set interaction across the non-transactional queue↔space-db seam).
      if (change._tag === 'delete') {
        return { foreignId: change.foreignId, key: 0 } satisfies Cursor.CommitUnit;
      }

      const mapped = change;
      const { feed } = yield* Cursor.Service;
      const commitEffects: Cursor.CommitEffect[] = [];

      // Each attachment's ref is inlined (its blob isn't attached to a database yet), so `.target`
      // resolves it synchronously without a Mapped.attachmentBlobs field to carry it separately.
      const blobs = (mapped.message.attachments ?? [])
        .map((attachment) => attachment.ref.target)
        .filter((target): target is Blob.Blob => Obj.instanceOf(Blob.Blob, target));
      if (feed && blobs.length > 0) {
        commitEffects.push(() => Feed.append(feed, blobs));
      }

      if (mapped.contact) {
        const contact = mapped.contact;
        commitEffects.push(
          Effect.fn('email.commit.addContact')(function* () {
            yield* Database.add(contact);
          }),
        );
      }

      if (mapped.supersededDrafts?.length) {
        const drafts = mapped.supersededDrafts;
        commitEffects.push(
          Effect.fn('email.commit.removeDrafts')(function* () {
            const { db } = yield* Database.Service;
            for (const draft of drafts) {
              db.remove(draft);
            }
          }),
        );
      }

      if (tagIndex && mapped.tagUris?.length) {
        tagUrisByObject.set(mapped.message, mapped.tagUris);
        commitEffects.push(applyTags);
      }

      return {
        object: mapped.message,
        foreignId: mapped.foreignId,
        key: mapped.key,
        commitEffects: commitEffects.length > 0 ? commitEffects : undefined,
      };
    }),
  );
};
