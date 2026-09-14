//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';

import { type SemanticIndexError } from '../../errors.ts';
import { FactPipeline } from '../../pipeline.ts';
import { type FactStore } from '../../store/index.ts';
import { type ExtractDocument } from '../../types/index.ts';
import { type Fact } from '../../types/index.ts';
import { factsToModule } from './serialize.ts';

/** Run the extraction pipeline over source documents and serialize the result to a facts module. */
export const generateFacts = (
  docs: readonly ExtractDocument[],
): Effect.Effect<{ facts: Fact[]; module: string }, SemanticIndexError, FactStore | AiService.AiService> =>
  Effect.gen(function* () {
    // Serialize only the facts produced for these docs (not the entire store).
    const facts = yield* FactPipeline.run(docs);
    return { facts, module: factsToModule(facts) };
  });
