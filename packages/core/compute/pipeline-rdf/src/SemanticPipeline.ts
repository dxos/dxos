//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type AiService } from '@dxos/ai';
import { Pipeline } from '@dxos/pipeline';

import { type SemanticIndexError } from './errors';
import { FactStore } from './FactStore';
import { type ExtractDocument, type ExtractOptions } from './internal/stages/extract';
import { indexFactsStage } from './stages';
import { type Fact } from './types';

export const SemanticPipeline = {
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
};
