//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Relation } from '@dxos/echo';
import { log } from '@dxos/log';

import { ExtractedFrom, InboxCapabilities, InboxOperation } from '../../types';

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

      // Persist created objects and their ExtractedFrom relations.
      for (const obj of result.created) {
        db.add(obj);
        const rel = ExtractedFrom.make({
          [Relation.Source]: obj,
          [Relation.Target]: message,
          extractorId: chosen.id,
          extractedAt,
          confidence: chosenConfidence,
        });
        db.add(rel);
      }

      // Updated objects were mutated in place by the extractor; do NOT re-add,
      // but record provenance for the contributing message.
      for (const obj of result.updated ?? []) {
        const rel = ExtractedFrom.make({
          [Relation.Source]: obj,
          [Relation.Target]: message,
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
