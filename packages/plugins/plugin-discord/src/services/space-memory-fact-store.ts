//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { CrawlState } from '@dxos/crawler';
import { Obj } from '@dxos/echo';
import * as MemoryService from '@dxos/echo-memory/MemoryService';
import { FactStore, FactStoreMemory } from '@dxos/pipeline-rdf';

/**
 * A {@link FactStore} over the space's memory, so every fact the extractor stores lands in the space's replicated fact
 * feed. The per-source content hashes that make re-ingest idempotent live in the crawl's {@link CrawlState.CrawlState},
 * so resetting the memory does not lose them and a message read again unchanged is never sent to the model again.
 */
export const spaceMemoryFactStoreLayer = ({
  state,
}: {
  state: CrawlState.CrawlState;
}): Layer.Layer<FactStore, never, MemoryService.MemoryService> =>
  Layer.effect(
    FactStore,
    Effect.gen(function* () {
      const store = FactStoreMemory.make(yield* MemoryService.MemoryService);
      return {
        ...store,
        cursor: (source) => Effect.sync(() => CrawlState.sourceHash(state, source)),
        setCursor: (source, hash) =>
          Effect.sync(() => {
            Obj.update(state, (state) => CrawlState.setSourceHash(state, source, hash));
          }),
      };
    }),
  );
