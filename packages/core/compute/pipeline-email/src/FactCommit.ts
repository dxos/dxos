//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';

import { FactStore } from '@dxos/pipeline-rdf';
import { Cursor, SyncBinding } from '@dxos/types';

import { type FactUnit } from './stages';

/**
 * `Pipeline.run` sink for the cursored fact pipeline. Persists a page of {@link FactUnit} facts to
 * the {@link FactStore} and advances the {@link SyncBinding} cursor to the page's max key in the
 * same step — page-atomic, mirroring `SyncBinding.upsertCommit`. Use after `Stream.grouped(pageSize)`
 * (which also emits the trailing partial page). Facts are extracted upstream (extract-only) and only
 * persisted here, so there is no double write.
 */
export const factsCommit = (page: Chunk.Chunk<FactUnit>): Effect.Effect<void, never, SyncBinding.Service | FactStore> =>
  Effect.gen(function* () {
    const units = Chunk.toReadonlyArray(page);
    if (units.length === 0) {
      return;
    }
    const store = yield* FactStore;
    const state = yield* SyncBinding.Service;
    const facts = units.flatMap((unit) => unit.facts);
    if (facts.length > 0) {
      // A fact-store write failure is fatal to the run (not a recoverable per-page error).
      yield* store.putFacts(facts).pipe(Effect.orDie);
    }
    const maxKey = Math.max(...units.map((unit) => unit.key));
    Cursor.advance(state.cursor, state.formatCursor(maxKey));
    for (const unit of units) {
      state.dedupSet.add(unit.foreignId);
    }
  });
