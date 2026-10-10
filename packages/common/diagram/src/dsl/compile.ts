//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SemanticEngine from '../semantic-engine.ts';
import { type ParseResult, read, withLayout } from './parse.ts';

/** Options for {@link compile}. */
export type CompileOptions = Pick<SemanticEngine.SolveOptions, 'emitCandidate'>;

/**
 * Reads a document and lays out its semantic statements with the full search, which also tries the
 * mermaid engine's placements when nothing was hinted. Asynchronous only because that engine's ELK
 * is; a document of scene statements alone reads exactly as {@link parse} reads it.
 */
export const compile: (text: string, options?: CompileOptions) => Effect.Effect<ParseResult> = Effect.fn('Dsl.compile')(
  function* (text: string, options: CompileOptions = {}) {
    const reading = read(text);
    const { diagram } = reading;
    if (!diagram) {
      return withLayout(reading);
    }
    const solution = yield* Effect.promise(() => SemanticEngine.compile(diagram, options));
    return withLayout(reading, solution);
  },
);
