//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, type Obj } from '@dxos/echo';
import { extractContact } from '@dxos/extractor-lib';
import { Stage } from '@dxos/pipeline';
import { SyncBinding } from '@dxos/plugin-connector';
import { type Message } from '@dxos/types';

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
 * Reusable across any provider whose mapped item carries a `Message`.
 *
 * `extractContact` dedups against the persisted db (skips a sender whose Person already exists), so
 * cross-run repeats never duplicate. Within a single run, before the first commit, two messages from
 * the same new sender would each yield a created Person; the run-scoped `createdContactEmails` set
 * keeps only the first.
 */
export const extractContactsStage: Stage.Stage<
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
