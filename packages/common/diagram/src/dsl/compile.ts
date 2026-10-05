//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SemanticEngine from '../semantic-engine.ts';
import { type ParseResult, read, withLayout } from './parse.ts';

/**
 * Reads a document and lays out its semantic statements with the full search, which also tries the
 * mermaid engine's placements when nothing was hinted. Asynchronous only because that engine's ELK
 * is; a document of scene statements alone reads exactly as {@link parse} reads it.
 */
export const compile = (text: string): Effect.Effect<ParseResult> =>
  Effect.gen(function* () {
    const reading = read(text);
    const { diagram } = reading;
    if (!diagram) {
      return withLayout(reading);
    }
    const solution = yield* Effect.promise(() => SemanticEngine.compile(diagram));
    return withLayout(reading, solution);
  });
