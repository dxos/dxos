//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';

import { type SemanticIndexError } from '../../errors';
import { type ExtractDocument } from '../../internal/stages/extract';
import { SemanticPipeline } from '../../SemanticPipeline';
import { type SemanticStore } from '../../SemanticStore';
import { type Fact } from '../../types';
import { factsToModule } from './serialize';

/** Run the extraction pipeline over source documents and serialize the result to a facts module. */
export const generateFacts = (
  docs: readonly ExtractDocument[],
): Effect.Effect<{ facts: Fact[]; module: string }, SemanticIndexError, SemanticStore | AiService.AiService> =>
  Effect.gen(function* () {
    // Serialize only the facts produced for these docs (not the entire store).
    const facts = yield* SemanticPipeline.run(docs);
    return { facts, module: factsToModule(facts) };
  });
