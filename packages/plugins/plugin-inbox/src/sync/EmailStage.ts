//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Blob, Database, Feed, Obj, Ref } from '@dxos/echo';
import { type ContactLookup, buildContactFromActor, buildContactLookup } from '@dxos/extractor-lib';
import { log } from '@dxos/log';
import { normalizeText } from '@dxos/markdown';
import { Stage } from '@dxos/pipeline';
import { SyncBinding } from '@dxos/plugin-connector';
import { Message } from '@dxos/types';

import { type Mailbox } from '../types';
import { runOnArrivalExtractors } from '../util/mailbox-sync';

/**
 * Reusable email-processing pipeline stages, on top of the generic sync machinery in
 * `SyncBinding` (source, dedup, commit). Provider-specific decode/map stages stay in each sync op.
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

/** A mapped message ready for contact extraction and commit. */
export type Mapped = {
  readonly message: Message.Message;
  readonly foreignId: string;
  readonly key: number;
  readonly tagUris: readonly string[];
  /** Attachments fetched by a provider-specific stage upstream of {@link processAttachments}. */
  readonly attachments?: readonly Attachment[];
  /**
   * Deferred writes accumulated by stages upstream of {@link extractContacts} (e.g.
   * {@link processAttachments}'s feed append), merged into the emitted {@link SyncBinding.CommitUnit}.
   */
  readonly commitEffects?: readonly SyncBinding.CommitEffect[];
};

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
 * Builds a Person (+ Organization link by domain) from the message sender, deferring the `db.add` to
 * the commit step as a {@link SyncBinding.CommitUnit} commit effect (the stage writes nothing itself).
 * A stage factory: call it once per pipeline run so its {@link ContactLookup} is scoped to that run.
 *
 * Dedups against both the space (contacts present before the run) and contacts created earlier in the
 * same run (the lookup is maintained as each is built, since a not-yet-committed contact wouldn't show
 * in a fresh query), so a repeat sender never yields a duplicate Person.
 */
export const extractContacts = (): Stage.Stage<Mapped, SyncBinding.CommitUnit, never, Database.Service> => {
  // Run-scoped contact/org lookup, seeded once on the first item and maintained by
  // `buildContactFromActor` as it creates contacts. Without it, each message re-queried every Person
  // and Organization in the space (O(#contacts) per message → O(n²) over a large sync) — the dominant
  // upstream cost measured in profiling.
  let lookup: ContactLookup | undefined;
  return Stage.map('extract-contacts', (mapped: Mapped) =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      if (!lookup) {
        lookup = yield* buildContactLookup(db);
      }
      const sender = mapped.message.sender;
      const contact = sender ? yield* buildContactFromActor(sender, db, lookup) : undefined;
      return {
        message: mapped.message,
        foreignId: mapped.foreignId,
        key: mapped.key,
        tagUris: mapped.tagUris,
        // Defer the write to commit (the stage stays idempotent) — add the extracted contact there,
        // alongside any deferred writes carried from earlier stages (e.g. attachment feed appends).
        commitEffects:
          mapped.commitEffects?.length || contact
            ? [
                ...(mapped.commitEffects ?? []),
                ...(contact
                  ? [
                      Effect.fn('sync.commit.addContact')(function* () {
                        yield* Database.add(contact);
                      }),
                    ]
                  : []),
              ]
            : undefined,
      };
    }),
  );
};

/**
 * Turns each of the item's `attachments` into a Blob object (via the database's configured storage
 * backend — edge in Composer) and adds a {@link Message.Attachment} to the message pointing at it.
 * The feed append for the created blobs is deferred to commit as a {@link SyncBinding.CommitEffect}
 * (the same mechanism {@link extractContacts} uses for its contact write) rather than a field on
 * {@link SyncBinding.CommitUnit} — appending to the feed only needs `Database.Service`, which is
 * exactly what a commit effect provides. A no-op when the item has no attachments or the run has no
 * feed target (e.g. a DB-target sync).
 *
 * One bad or oversized attachment must not fail the whole message: each `Blob.fromBytes` is caught
 * and logged individually, so a rejected attachment is simply dropped from the message.
 */
export const processAttachments = (): Stage.Stage<Mapped, Mapped, never, Database.Service | SyncBinding.Service> =>
  Stage.map('process-attachments', (mapped: Mapped) =>
    Effect.gen(function* () {
      if (!mapped.attachments?.length) {
        return mapped;
      }
      const { feed } = yield* SyncBinding.Service;
      if (!feed) {
        return mapped;
      }

      const blobs: Blob.Blob[] = [];
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
        blobs.push(blob);
        attachments.push({ name: attachment.name, ref: Ref.make(blob), contentId: attachment.contentId });
      }
      if (blobs.length === 0) {
        return mapped;
      }

      // The message is not yet appended to the feed, so mutating it here is safe — mirrors how the
      // mappers assemble `blocks` before the message is ever persisted.
      Obj.update(mapped.message, (message) => {
        message.attachments = [...(message.attachments ?? []), ...attachments];
      });

      const appendAttachmentBlobs: SyncBinding.CommitEffect = () => Feed.append(feed, blobs);
      return {
        ...mapped,
        commitEffects: [...(mapped.commitEffects ?? []), appendAttachmentBlobs],
      };
    }),
  );

/**
 * Optional stage that runs the mailbox's configured on-arrival extractors (AI and others) for each
 * item's message, passing the item through unchanged. Self-gating: a no-op when the mailbox has no
 * extractors enabled. Sender→contact extraction is handled unconditionally by {@link extractContacts};
 * this stage covers the remaining, config-gated extractors.
 *
 * TODO(wittjosiah): Factor these extractors out into their own downstream pipeline.
 */
export const onArrivalExtractors =
  (mailbox: Mailbox.Mailbox) =>
  <In extends { readonly message: Message.Message }, E, R>(
    self: Stream.Stream<In, E, R>,
  ): Stream.Stream<In, E, R | Capability.Service | Operation.Service> =>
    Stage.map('on-arrival-extractors', (item: In) =>
      runOnArrivalExtractors(mailbox, [item.message]).pipe(Effect.as(item)),
    )(self);
