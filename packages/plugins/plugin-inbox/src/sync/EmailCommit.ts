//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import { Cursor } from '@dxos/cursor';
import { Blob, Database, Feed, Obj } from '@dxos/echo';
import { Stage } from '@dxos/pipeline';
import { type EmailStage } from '@dxos/pipeline-email';

/**
 * Terminal stage converting a run's {@link EmailStage.Mapped} item into the
 * {@link Cursor.CommitUnit} the commit sink consumes. The one place that turns what upstream
 * stages recorded into deferred writes: `message.attachments` (populated by
 * `EmailStage.processAttachments`) becomes a feed-append commit effect for the referenced blobs, and
 * `mapped.contact` (from `EmailStage.extractContacts`) becomes a `db.add` commit effect. Every other
 * email stage is Mapped → Mapped and composes in any order; this is the one stage that must run
 * last, and the one stage coupled to the sync run-machinery — the generic stages live in
 * `@dxos/pipeline-email` instead.
 */
export const toCommitUnit = (): Stage.Stage<EmailStage.Mapped, Cursor.CommitUnit, never, Cursor.Service> =>
  Stage.map('to-commit-unit', (mapped: EmailStage.Mapped) =>
    Effect.gen(function* () {
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
          Effect.fn('sync.commit.addContact')(function* () {
            yield* Database.add(contact);
          }),
        );
      }

      if (mapped.supersededDrafts?.length) {
        const drafts = mapped.supersededDrafts;
        commitEffects.push(
          Effect.fn('sync.commit.removeDrafts')(function* () {
            const { db } = yield* Database.Service;
            for (const draft of drafts) {
              db.remove(draft);
            }
          }),
        );
      }
      return {
        message: mapped.message,
        foreignId: mapped.foreignId,
        key: mapped.key,
        tagUris: mapped.tagUris,
        commitEffects: commitEffects.length > 0 ? commitEffects : undefined,
      };
    }),
  );
