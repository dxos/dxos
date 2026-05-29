//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { Obj, type Relation } from '@dxos/echo';
import { log } from '@dxos/log';

import { ExtractorRegistry } from './ExtractorRegistry';
import { type ExtractError, type ExtractInput, type ExtractResult, type ObjectExtractor } from './ObjectExtractor';
import { type Resolver } from './Resolver';

export class NoMatchingExtractorError extends Error {
  readonly _tag = 'NoMatchingExtractorError';
  constructor(readonly extractorId?: string) {
    super(extractorId ? `Extractor not found or did not match: ${extractorId}` : 'No extractor matched the source.');
  }
}

/** Parameters handed to a provenance-relation factory for each top-level extracted object. */
export interface ProvenanceParams {
  readonly source: Obj.Any;
  readonly object: Obj.Any;
  readonly extractorId: string;
  readonly extractedAt: string;
  readonly confidence?: number;
}

export interface DispatchInput extends ExtractInput {
  /** Force a specific extractor; otherwise the highest-confidence match is chosen. */
  readonly extractorId?: string;
}

export interface DispatchOptions {
  /**
   * Interpose before persistence. Defaults to identity (no-op). Returning `undefined` cancels
   * the extraction — no objects or relations are written. This is the seam a preview/edit
   * Dialog or a server-side policy hooks into.
   */
  readonly onProposal?: (result: ExtractResult) => Effect.Effect<ExtractResult | undefined>;
  /**
   * Factory for the provenance relation attached to each top-level created/updated object. When
   * omitted, no provenance relations are written. Kept out of core so this package does not
   * depend on any particular relation type (e.g. the inbox `ExtractedFrom`). Return `undefined`
   * to skip a single relation (e.g. when the source is not a live ECHO object).
   */
  readonly provenance?: (params: ProvenanceParams) => Relation.Unknown | undefined;
}

export interface DispatchOutcome {
  readonly extractorId: string;
  readonly confidence?: number;
  /** Final result after `onProposal`, or `undefined` when the extraction was cancelled. */
  readonly result?: ExtractResult;
  readonly cancelled: boolean;
}

const pickExtractor = (
  extractors: ReadonlyArray<ObjectExtractor>,
  source: Obj.Any,
  extractorId: string | undefined,
): { extractor: ObjectExtractor; confidence?: number } | undefined => {
  const sourceType = Obj.getTypename(source);
  const candidates = extractors.filter(
    (extractor) =>
      extractor.sourceTypes.length === 0 || (sourceType !== undefined && extractor.sourceTypes.includes(sourceType)),
  );

  if (extractorId !== undefined) {
    const found = candidates.find((extractor) => extractor.id === extractorId);
    if (!found) {
      return undefined;
    }
    const matchResult = found.match(source);
    return matchResult.matched ? { extractor: found, confidence: matchResult.confidence } : undefined;
  }

  let best: ObjectExtractor | undefined;
  let bestConfidence = -Infinity;
  for (const extractor of candidates) {
    const matchResult = extractor.match(source);
    if (matchResult.matched) {
      const confidence = matchResult.confidence ?? 0;
      if (confidence > bestConfidence) {
        best = extractor;
        bestConfidence = confidence;
      }
    }
  }

  return best ? { extractor: best, confidence: bestConfidence === -Infinity ? undefined : bestConfidence } : undefined;
};

/**
 * Generic extraction dispatcher. Resolves the registered extractors, picks one (by `extractorId`
 * or highest-confidence `match`, pre-filtered by `sourceTypes`), runs its `extract`, passes the
 * result through `onProposal`, then persists: created objects are `db.add`-ed, top-level
 * created/updated objects get a provenance relation (when a factory is supplied and the
 * extractor opts in), and extra relations are persisted verbatim. Tags are NOT applied here —
 * the consuming plugin interprets `result.tags`.
 */
export const dispatch = (
  { db, source, extractorId }: DispatchInput,
  options: DispatchOptions = {},
): Effect.Effect<
  DispatchOutcome,
  NoMatchingExtractorError | ExtractError,
  ExtractorRegistry | Resolver | AiService.AiService
> =>
  Effect.gen(function* () {
    const registry = yield* ExtractorRegistry;
    const extractors = yield* registry.all();

    const picked = pickExtractor(extractors, source, extractorId);
    if (!picked) {
      return yield* Effect.fail(new NoMatchingExtractorError(extractorId));
    }
    const { extractor, confidence } = picked;

    log.info('extract', { extractorId: extractor.id, confidence });

    const extracted = yield* extractor.extract({ db, source });

    // The single seam before any write. Default to identity.
    const onProposal = options.onProposal ?? ((result: ExtractResult) => Effect.succeed(result));
    const proposed = yield* onProposal(extracted);
    if (!proposed) {
      return { extractorId: extractor.id, confidence, cancelled: true };
    }

    const extractedAt = new Date().toISOString();
    const shouldRelate = extractor.createRelation !== false && options.provenance !== undefined;

    const relate = (object: Obj.Any) => {
      if (!shouldRelate || Obj.getParent(object) !== undefined) {
        return;
      }
      // The provenance factory returns `undefined` to opt out (e.g. when the source could not be
      // resolved to a live ECHO object — a relation endpoint must be a live proxy, not a snapshot).
      const relation = options.provenance!({ source, object, extractorId: extractor.id, extractedAt, confidence });
      if (relation) {
        db.add(relation);
      }
    };

    for (const object of proposed.created) {
      db.add(object);
      relate(object);
    }
    // Updated objects were mutated in place by the extractor; do NOT re-add.
    for (const object of proposed.updated ?? []) {
      relate(object);
    }
    for (const relation of proposed.relations) {
      db.add(relation);
    }

    return { extractorId: extractor.id, confidence, result: proposed, cancelled: false };
  });
