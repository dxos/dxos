//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { log } from '@dxos/log';

import { ExtractedFrom, InboxCapabilities, InboxOperation, Mailbox } from '../../types';

class NoMatchingExtractorError extends Error {
  readonly _tag = 'NoMatchingExtractorError';
  constructor(readonly extractorId?: string) {
    super(extractorId ? `Extractor not found or did not match: ${extractorId}` : 'No extractor matched the message.');
  }
}

/**
 * Generic dispatcher for the MessageExtractor capability. Resolves the registered extractors,
 * picks one (by `extractorId` when supplied, otherwise the highest-confidence `match()` over
 * the message), runs its `extract()` Effect, and persists the result: newly-created objects
 * are `db.add`-ed, updated objects are left in place, and every created/updated object gets
 * an `ExtractedFrom` relation back to the source message for provenance (carrying the
 * extractor id, timestamp, and confidence). Additional relations returned by the extractor
 * are persisted verbatim. Fails with `NoMatchingExtractorError` when no extractor matches.
 */
const handler: Operation.WithHandler<typeof InboxOperation.ExtractMessage> = InboxOperation.ExtractMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, message, extractorId, targetTripId }) {
      const extractors = yield* Capability.getAll(InboxCapabilities.MessageExtractor);

      // Pick the extractor.
      let chosen: (typeof extractors)[number];
      let chosenConfidence: number | undefined;

      if (extractorId !== undefined) {
        const found = extractors.find((e) => e.id === extractorId);
        if (!found) {
          return yield* Effect.fail(new NoMatchingExtractorError(extractorId));
        }
        const matchResult = found.match(message);
        if (!matchResult.matched) {
          return yield* Effect.fail(new NoMatchingExtractorError(extractorId));
        }
        chosen = found;
        chosenConfidence = matchResult.confidence;
      } else {
        // Auto-select the highest-confidence matched extractor.
        let best: (typeof extractors)[number] | undefined;
        let bestConfidence = -Infinity;

        for (const extractor of extractors) {
          const matchResult = extractor.match(message);
          if (matchResult.matched) {
            const confidence = matchResult.confidence ?? 0;
            if (confidence > bestConfidence) {
              best = extractor;
              bestConfidence = confidence;
            }
          }
        }

        if (!best) {
          return yield* Effect.fail(new NoMatchingExtractorError());
        }
        chosen = best;
        chosenConfidence = bestConfidence === -Infinity ? undefined : bestConfidence;
      }

      log.info('extract message', { extractorId: chosen.id, confidence: chosenConfidence });

      const result = yield* chosen.extract({ db, message, targetTripId });

      const extractedAt = new Date().toISOString();
      // Two gates on relation creation:
      //  1. Per-extractor opt-out via `createRelation: false` — for extractors whose output
      //     is already linked to the message by some other field (e.g. the contact extractor
      //     materialises `msg.sender`, which the Message schema already references).
      //  2. Per-object: only top-level objects (no parent via `Obj.setParent`) get an edge,
      //     so the trip extractor's Trip + Booking + Segment trio surfaces as one Trip chip,
      //     not three.
      const shouldRelate = chosen.createRelation !== false;
      const hasTags = !!result.tags && result.tags.length > 0;

      // Resolve the owning mailbox AND the live message object. The `message` arg may be a
      // deserialized snapshot (this operation runs in a separate process), and both
      // `ExtractedFrom` relation endpoints and tag `Ref`s require live ECHO proxies — a
      // snapshot as a relation Target throws "target must be an ECHO object". The owning
      // mailbox's feed holds the live object, so resolve it by querying each mailbox's feed
      // for the message id. Falls back to the passed `message` (unit tests add it to the db
      // directly, so it's already a proxy) and the first mailbox in the space.
      let owningMailbox: Mailbox.Mailbox | undefined;
      let sourceMessage = message;
      if (shouldRelate || hasTags) {
        const mailboxes = yield* Effect.promise(() => db.query(Filter.type(Mailbox.Mailbox)).run());
        const resolved = yield* Effect.promise(async () => {
          for (const candidate of mailboxes) {
            const feed = await candidate.feed?.tryLoad();
            if (!feed) {
              continue;
            }
            const found = await db.query(Query.select(Filter.id(message.id)).from(feed)).run();
            if (found.length > 0) {
              return { mailbox: candidate, message: found[0] };
            }
          }
          return { mailbox: mailboxes[0], message: undefined };
        });
        owningMailbox = resolved.mailbox;
        sourceMessage = resolved.message ?? message;
      }

      // Persist created objects, then attach an ExtractedFrom relation for each top-level
      // one when the extractor opts in.
      for (const obj of result.created) {
        db.add(obj);
        if (!shouldRelate || Obj.getParent(obj) !== undefined) {
          continue;
        }
        const rel = ExtractedFrom.make({
          [Relation.Source]: obj,
          [Relation.Target]: sourceMessage,
          extractorId: chosen.id,
          extractedAt,
          confidence: chosenConfidence,
        });
        db.add(rel);
      }

      // Updated objects were mutated in place by the extractor; do NOT re-add. Same gates
      // as created objects.
      for (const obj of result.updated ?? []) {
        if (!shouldRelate || Obj.getParent(obj) !== undefined) {
          continue;
        }
        const rel = ExtractedFrom.make({
          [Relation.Source]: obj,
          [Relation.Target]: sourceMessage,
          extractorId: chosen.id,
          extractedAt,
          confidence: chosenConfidence,
        });
        db.add(rel);
      }

      // Persist additional relations from the extractor.
      for (const rel of result.relations) {
        db.add(rel);
      }

      // Apply tags to the source message via the owning mailbox's tag map.
      if (hasTags && owningMailbox) {
        for (const tag of result.tags!) {
          Mailbox.applyTag(owningMailbox, tag, sourceMessage);
        }
      }

      return {
        extractorId: chosen.id,
        created: result.created.length,
        updated: result.updated?.length ?? 0,
        summary: result.summary,
      };
    }),
  ),
);

export default handler;
