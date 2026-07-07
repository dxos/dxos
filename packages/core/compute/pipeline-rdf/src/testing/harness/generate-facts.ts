//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';

import { type SemanticIndexError } from '../../errors';
import { type FactStore } from '../../FactStore';
import { type ExtractDocument } from '../../internal/stages/extract';
import { SemanticPipeline } from '../../SemanticPipeline';
import { type Fact } from '../../types';
import { factsToModule } from './serialize';

/** Run the extraction pipeline over source documents and serialize the result to a facts module. */
export const generateFacts = (
  docs: readonly ExtractDocument[],
): Effect.Effect<{ facts: Fact[]; module: string }, SemanticIndexError, FactStore | AiService.AiService> =>
  Effect.gen(function* () {
    // Serialize only the facts produced for these docs (not the entire store).
    const facts = yield* SemanticPipeline.run(docs);
    return { facts, module: factsToModule(facts) };
  });
