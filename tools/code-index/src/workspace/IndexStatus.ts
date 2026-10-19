//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Console from 'effect/Console';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Ref from 'effect/Ref';
import * as Semaphore from 'effect/Semaphore';
import type * as Stream from 'effect/Stream';
import * as SubscriptionRef from 'effect/SubscriptionRef';

import * as Ontology from '../Ontology.ts';
import * as Store from '../Store.ts';
import type * as Watch from '../Watch.ts';
import * as IndexState from './IndexState.ts';

/**
 * What the index is doing, for the web UI's footer: the folded watcher state (`IndexState.ts`) and
 * the declaration count kept beside it. The count costs a query over the whole store, so it is taken
 * once per store generation — when a pass finishes — and `Info` only reads it.
 */

const PREFIX = `PREFIX deus: <${Ontology.PREFIX}>`;

/** Everything a file declares, its top level included; anchored on the predicate, so one index scan. */
const ALL_DECLARATIONS = `${PREFIX} SELECT (COUNT(*) AS ?n) WHERE { ?file deus:declares ?symbol }`;

/** Each file's top-level pseudo-symbol, which is not a declaration anyone wrote; anchored on the literal. */
const TOP_LEVELS = `${PREFIX} SELECT (COUNT(*) AS ?n) WHERE {
  ?symbol deus:name ${JSON.stringify(Ontology.TOP_LEVEL)} . ?file deus:declares ?symbol }`;

export interface Api {
  /** The current status, then every change to it. */
  readonly changes: Stream.Stream<IndexState.Status>;
  /** Folds one watcher event; a finished or failed pass recounts before the new state is published. */
  readonly report: (event: Watch.Event) => Effect.Effect<void>;
  /** Symbol declarations in the index as of the last count; `undefined` until the first finishes. */
  readonly declarations: () => Effect.Effect<number | undefined>;
}

export class IndexStatus extends Context.Service<IndexStatus, Api>()('code-index/IndexStatus') {}

/** Starts counting declarations at once; `watching` says whether a watcher will report passes. */
export const layer = (options: { readonly watching: boolean }): Layer.Layer<IndexStatus, never, Store.Store> =>
  Layer.effect(
    IndexStatus,
    Effect.gen(function* () {
      const store = yield* Store.Store;
      const status = yield* SubscriptionRef.make<IndexState.Status>({
        state: options.watching ? { _tag: 'Starting' } : { _tag: 'Static' },
        revision: 0,
      });
      const counted = yield* Ref.make<{ readonly generation: number; readonly declarations: number } | undefined>(
        undefined,
      );
      // One count at a time, so a pass finishing during the startup count waits for it and reuses it.
      const gate = yield* Semaphore.make(1);

      const count = (sparql: string) => Effect.map(store.select(sparql), (rows) => Number(rows[0]?.n ?? 0));

      /** Recounts unless the store has not changed since the last count; true when it did. */
      const recount = Effect.gen(function* () {
        const generation = yield* store.generation();
        if ((yield* Ref.get(counted))?.generation === generation) {
          return false;
        }
        const [all, topLevels] = yield* Effect.all([count(ALL_DECLARATIONS), count(TOP_LEVELS)]);
        yield* Ref.set(counted, { generation, declarations: Math.max(0, all - topLevels) });
        return true;
      }).pipe(
        Semaphore.withPermits(gate, 1),
        // A failed count leaves the last one standing; the footer is no place to fail the server.
        Effect.catch((error) =>
          Effect.as(Console.error(`code-index · cannot count declarations: ${error.message}`), false),
        ),
      );

      const bump = (state?: IndexState.State) =>
        SubscriptionRef.update(status, (current) => ({
          state: state ?? current.state,
          revision: current.revision + 1,
        }));

      yield* recount.pipe(
        Effect.flatMap((changed) => (changed ? bump() : Effect.void)),
        Effect.forkScoped,
      );

      return {
        changes: SubscriptionRef.changes(status),
        report: (event) =>
          Effect.gen(function* () {
            const current = yield* SubscriptionRef.get(status);
            const next = IndexState.apply(current.state, event, Date.now());
            if (event._tag === 'Passed' || event._tag === 'Failed') {
              yield* recount;
              return yield* bump(next);
            }
            yield* SubscriptionRef.set(status, { ...current, state: next });
          }),
        declarations: () => Effect.map(Ref.get(counted), (value) => value?.declarations),
      } satisfies Api;
    }),
  );
