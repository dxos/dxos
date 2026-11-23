//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as EffectEx from '@dxos/effect/EffectEx';
import { type FactStoreApi } from '@dxos/pipeline-rdf';

// Kept out of `MemoryArticle.tsx`: react-refresh only fast-refreshes a module whose exports are all components.

const COUNT_SPARQL = 'SELECT (COUNT(*) AS ?n) WHERE { GRAPH ?g { ?s ?p ?o } }';

/** How many statements the store holds across its named graphs; undefined when the store cannot be read. */
export const statementCount = (store: FactStoreApi): Promise<number | undefined> =>
  EffectEx.runPromise(
    store.rows(COUNT_SPARQL).pipe(
      Effect.map(([row]) => Number(row?.n?.value ?? 0)),
      Effect.orElseSucceed(() => undefined),
    ),
  );

/** Adds a TriG (or Turtle) document's quads to the store. */
export const importTrig = (store: FactStoreApi, trig: string): Promise<{ quads: number } | { error: string }> =>
  EffectEx.runPromise(
    store.importTrig(trig).pipe(
      Effect.map((quads) => ({ quads })),
      Effect.catch((error) => Effect.succeed({ error: error.message })),
    ),
  );

/** The store serialized as TriG. */
export const exportTrig = (store: FactStoreApi): Promise<{ trig: string } | { error: string }> =>
  EffectEx.runPromise(
    store.exportTrig().pipe(
      Effect.map((trig) => ({ trig })),
      Effect.catch((error) => Effect.succeed({ error: error.message })),
    ),
  );

/** Removes every fact, entity and cursor from the store; the seed vocabulary is restored. */
export const clearStore = (store: FactStoreApi): Promise<{ ok: true } | { error: string }> =>
  EffectEx.runPromise(
    store.clear().pipe(
      Effect.as({ ok: true as const }),
      Effect.catch((error) => Effect.succeed({ error: error.message })),
    ),
  );

/** Runs a SELECT for the memory view; its result reaches the view through the query log, so it is not returned. */
export const runQuery = (store: FactStoreApi, sparql: string): Promise<void> =>
  EffectEx.runPromise(store.rows(sparql).pipe(Effect.asVoid, Effect.ignore));

/** Saves text as a file through a temporary link, the browser's only way to hand the viewer a download. */
export const downloadText = (text: string, filename: string, type: string): void => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
