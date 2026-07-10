//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { Database, type Feed } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { EMAIL_EXTRACT_OPTIONS, type FactExtractor, messageToDocument, runFactPipeline } from '@dxos/pipeline-email';
import { FactStore, type FeedCursorsApi, type RDF, extractDocFacts } from '@dxos/pipeline-rdf';

import { type ModelVariant } from './models';

/** In-memory per-feed high-water cursor (mirrors the pipeline-rdf FeedCursors registry). */
export const makeCursors = (): FeedCursorsApi => {
  const map = new Map<string, number>();
  return {
    get: (feedId) => map.get(feedId) ?? 0,
    advance: (feedId, key) => void map.set(feedId, Math.max(map.get(feedId) ?? 0, key)),
    reset: (feedId) => void map.delete(feedId),
  };
};

export type FactsRunResult = {
  readonly processed: number;
  readonly facts: readonly RDF.Fact[];
};

/**
 * Runs the cursored email fact pipeline over `feed` under one model variant, returning the pipeline
 * counts plus the full extracted fact set (so callers can persist it as a fixture). The `extract`
 * closure injects the variant's model/provider/strict into pipeline-rdf's `extractDocFacts`, exactly
 * as the `AnalyzeMailbox` operation does.
 */
export const extractFactsForVariant = (
  variant: ModelVariant,
  feed: Feed.Feed,
  db: Database.Database,
  pageSize = 1,
): Promise<FactsRunResult> =>
  EffectEx.runPromise(
    Effect.gen(function* () {
      const aiService = yield* AiService.AiService;
      // A hung/very-slow model call must not stall the whole run (a single big page blocks on it);
      // time each message out and degrade to zero facts for that message.
      const noFacts: RDF.Fact[] = [];
      const extract: FactExtractor = (message) =>
        EffectEx.runPromise(
          extractDocFacts(messageToDocument(message), {
            ...EMAIL_EXTRACT_OPTIONS,
            model: variant.model,
            provider: variant.provider,
            strict: variant.strict,
          }).pipe(
            Effect.provideService(AiService.AiService, aiService),
            Effect.timeout('120 seconds'),
            Effect.orElse(() => Effect.succeed(noFacts)),
          ),
        );

      const { processed } = yield* runFactPipeline({ feed, cursors: makeCursors(), extract, pageSize });
      const store = yield* FactStore;
      const facts = yield* store.query({});
      return { processed, facts } satisfies FactsRunResult;
    }).pipe(
      Effect.provide(Database.layer(db)),
      Effect.provide(FactStore.layerMemory),
      Effect.provide(AiServiceTestingPreset(variant.preset)),
    ),
  );
