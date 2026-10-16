//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type AiService } from '@dxos/ai';
import { Pipeline } from '@dxos/pipeline';

import { type SemanticIndexError } from './errors.ts';
import { type IndexBatchOptions, indexFactsBatchStage, indexFactsStage } from './stages/index.ts';
import { FactStore } from './store/index.ts';
import { type ExtractDocument, type ExtractOptions } from './types/index.ts';
import { type Fact } from './types/index.ts';

export const FactPipeline = {
  /**
   * Batch convenience over {@link indexFactsStage}: streams the documents through the indexing
   * stage and collects every persisted fact. Documents are processed in order with back pressure.
   */
  run: (
    docs: readonly ExtractDocument[],
    options?: ExtractOptions,
  ): Effect.Effect<Fact[], SemanticIndexError, FactStore | AiService.AiService> =>
    Effect.gen(function* () {
      const allFacts: Fact[] = [];
      yield* Stream.fromIterable(docs).pipe(
        indexFactsStage(options),
        Pipeline.run({ sink: ({ facts }) => Effect.sync(() => allFacts.push(...facts)) }),
      );
      return allFacts;
    }),

  /**
   * {@link run} through {@link indexFactsBatchStage}: documents are extracted `batchSize` at a time, one model
   * request per batch transcript rather than per document.
   */
  runBatch: (
    docs: readonly ExtractDocument[],
    options?: IndexBatchOptions,
  ): Effect.Effect<Fact[], SemanticIndexError, FactStore | AiService.AiService> =>
    Effect.gen(function* () {
      const allFacts: Fact[] = [];
      yield* Stream.fromIterable(docs).pipe(
        indexFactsBatchStage(options),
        Pipeline.run({ sink: ({ facts }) => Effect.sync(() => allFacts.push(...facts)) }),
      );
      return allFacts;
    }),
};
