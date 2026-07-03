//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Database, type Obj } from '@dxos/echo';
import { extractContact } from '@dxos/extractor-lib';
import { Stage } from '@dxos/pipeline';
import { type Message } from '@dxos/types';

import * as SyncPipeline from '../SyncPipeline';

/** A mapped message ready for contact extraction and commit. */
export type Mapped = {
  readonly message: Message.Message;
  readonly foreignId: string;
  readonly key: number;
  readonly tagUris: readonly string[];
};

/** Context an extract-contacts stage reads (a structural subset of the full pipeline context). */
export type ExtractContext = {
  readonly db: Database.Database;
  /** Contact emails created earlier in this run, to dedup repeats before the first commit. */
  readonly createdContactEmails: Set<string>;
};

/**
 * Runs the shared `contactExtractor` to build a Person (+ Organization link by domain) from the
 * message sender, producing the objects for the commit step to `db.add` (it writes nothing itself).
 * Reusable across any provider whose mapped item carries a `Message`.
 *
 * `extractContact` dedups against the persisted db (skips a sender whose Person already exists), so
 * cross-run repeats never duplicate. Within a single run, before the first commit, two messages from
 * the same new sender would each yield a created Person; the run-scoped `createdContactEmails` set
 * keeps only the first.
 */
export const extractContactsStage: Stage.Stage<Mapped, SyncPipeline.CommitUnit, ExtractContext, never> = Stage.map(
  'extract-contacts',
  (mapped, ctx) =>
    Effect.gen(function* () {
      const result = yield* extractContact({ db: ctx.db, source: mapped.message });
      const email = mapped.message.sender?.email?.trim().toLowerCase();
      const alreadyCreated = !!email && ctx.createdContactEmails.has(email);
      const extractedObjects: Obj.Any[] = alreadyCreated ? [] : [...result.created];
      if (email && extractedObjects.length > 0) {
        ctx.createdContactEmails.add(email);
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
