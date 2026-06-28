//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';

import { factsToModule } from './serialize';
import { type SemanticIndexError } from '../../errors';
import { SemanticPipeline } from '../../SemanticPipeline';
import { SemanticStore } from '../../SemanticStore';
import { type ExtractDocument } from '../../internal/stages/extract';
import { type Fact } from '../../types';

/** Run the extraction pipeline over source documents and serialize the result to a facts module. */
export const generateFacts = (
  docs: readonly ExtractDocument[],
): Effect.Effect<{ facts: Fact[]; module: string }, SemanticIndexError, SemanticStore | AiService.AiService> =>
  Effect.gen(function* () {
    yield* SemanticPipeline.run(docs);
    const store = yield* SemanticStore;
    const facts = yield* store.query({});
    return { facts, module: factsToModule(facts) };
  });
