//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { type ContactLookup, buildContactFromActor, buildContactLookup } from '@dxos/extractor-lib';
import { normalizeText } from '@dxos/markdown';
import { Stage } from '@dxos/pipeline';
import { SyncBinding } from '@dxos/plugin-connector';
import { Message } from '@dxos/types';

import { type Mailbox, ThreadIndex } from '../types';
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
        // Defer the write to commit (the stage stays idempotent) — add the extracted contact there.
        commitEffects: contact
          ? [
              Effect.fn('sync.commit.addContact')(function* () {
                yield* Database.add(contact);
              }),
            ]
          : undefined,
      };
    }),
  );
};

/**
 * Records each message's thread membership into the mailbox's {@link ThreadIndex}. The stage stays
 * idempotent — it only aggregates the write as a deferred commit effect on the {@link SyncBinding.CommitUnit};
 * the actual index mutation runs inside `SyncBinding.commit`'s flush, alongside the feed append (so a
 * crash never leaves the index referencing an uncommitted message). Messages without a provider
 * `threadId` pass through unchanged.
 *
 * The closure attached per unit (`record`) is created once per call to `recordThreads(threadIndex)` —
 * once per pipeline run — and the same reference is reused for every unit. `SyncBinding.commit`
 * dedupes commit effects by function identity, so this reuse is what turns a page's worth of
 * thread-membership writes into a single {@link ThreadIndex.Accessor.addBatch} call instead of one
 * `add` per message; without a stable reference, each unit would get its own one-off closure and
 * every add would still pay the batch's `Object.keys` scan individually.
 */
export const recordThreads = (threadIndex: ThreadIndex.ThreadIndex) => {
  // One accessor for the whole run so its thread-id snapshot is taken once (not per page) — see
  // `ThreadIndex.bind`. The `recordThreads` factory is called once per pipeline run.
  const accessor = ThreadIndex.bind(threadIndex);
  const record: SyncBinding.CommitEffect = Effect.fn('sync.commit.recordThreads')(function* (
    units: readonly SyncBinding.CommitUnit[],
  ) {
    const entries = units.flatMap((unit) => {
      const message = unit.message;
      return Obj.instanceOf(Message.Message, message) && message.threadId
        ? [{ threadId: message.threadId, message }]
        : [];
    });
    yield* Effect.sync(() => accessor.addBatch(entries));
  });

  return <In extends SyncBinding.CommitUnit, E, R>(self: Stream.Stream<In, E, R>): Stream.Stream<In, E, R> =>
    Stage.map('record-threads', (unit: In) =>
      Effect.sync(() => {
        const message = unit.message;
        if (!Obj.instanceOf(Message.Message, message) || !message.threadId) {
          return unit;
        }
        return {
          ...unit,
          commitEffects: [...(unit.commitEffects ?? []), record],
        };
      }),
    )(self);
};

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
