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
import { type ExtractDocument } from './types/index.ts';
import { type Fact } from './types/index.ts';

export const FactPipeline = {
  /**
   * Batch convenience over {@link indexFactsStage}: streams the documents through the indexing
   * stage and collects every persisted fact. Documents are processed in order with back pressure.
   * With `batchSize` set, documents go through {@link indexFactsBatchStage} instead: one model request
   * per batch transcript rather than per document.
   */
  run: Effect.fnUntraced(function* (
    docs: readonly ExtractDocument[],
    options?: IndexBatchOptions,
  ): Effect.fn.Return<Fact[], SemanticIndexError, FactStore | AiService.AiService> {
    const allFacts: Fact[] = [];
    yield* Stream.fromIterable(docs).pipe(
      options?.batchSize === undefined ? indexFactsStage(options) : indexFactsBatchStage(options),
      Pipeline.run({ sink: ({ facts }) => Effect.sync(() => allFacts.push(...facts)) }),
    );
    return allFacts;
  }),
};
