//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, type Obj } from '@dxos/echo';
import { extractContact } from '@dxos/extractor-lib';
import { normalizeText } from '@dxos/markdown';
import { Stage } from '@dxos/pipeline';
import { SyncBinding } from '@dxos/plugin-connector';
import { type Message } from '@dxos/types';

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
};

/**
 * Runs the shared `contactExtractor` to build a Person (+ Organization link by domain) from the
 * message sender, producing the objects for the commit step to `db.add` (it writes nothing itself).
 *
 * `extractContact` dedups against the persisted db (skips a sender whose Person already exists), so
 * cross-run repeats never duplicate. Within a single run, before the first commit, two messages from
 * the same new sender would each yield a created Person; the run-scoped `createdContactEmails` set
 * keeps only the first.
 */
export const extractContacts: Stage.Stage<
  Mapped,
  SyncBinding.CommitUnit,
  never,
  SyncBinding.Service | Database.Service
> = Stage.map('extract-contacts', (mapped: Mapped) =>
  Effect.gen(function* () {
    const { createdContactEmails } = yield* SyncBinding.Service;
    const { db } = yield* Database.Service;
    const result = yield* extractContact({ db, source: mapped.message });
    const email = mapped.message.sender?.email?.trim().toLowerCase();
    const alreadyCreated = !!email && createdContactEmails.has(email);
    const extractedObjects: Obj.Any[] = alreadyCreated ? [] : [...result.created];
    if (email && extractedObjects.length > 0) {
      createdContactEmails.add(email);
    }

    return {
      message: mapped.message,
      foreignId: mapped.foreignId,
      key: mapped.key,
      tagUris: mapped.tagUris,
      extractedObjects,
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
