//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Scope from 'effect/Scope';
import { useEffect, useState } from 'react';

import { type Client } from '@dxos/client';
import { type Fact, MemoryQuery, type MemoryService } from '@dxos/echo-memory';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type SpaceId } from '@dxos/keys';

/**
 * Reads all facts from a memory once. Extracted as a plain async function so the read path is unit-testable without
 * provisioning the full capability/render stack. Falls back to an empty list on query failure so the surface never
 * crashes on an unreachable memory.
 */
export const queryFacts = (memory: MemoryService.Service): Promise<readonly Fact.Fact[]> =>
  EffectEx.runPromise(memory.query(MemoryQuery.facts()).pipe(Effect.orElseSucceed((): readonly Fact.Fact[] => [])));

/**
 * Loads the facts of a space's memory, re-querying whenever its store applies a batch, so the view stays live as the
 * analysis pipeline writes, another device's writes arrive, or a reset clears it.
 */
export const useFacts = (client: Client, spaceId: SpaceId | undefined): Fact.Fact[] => {
  const [facts, setFacts] = useState<Fact.Fact[]>([]);
  useEffect(() => {
    if (spaceId === undefined) {
      setFacts([]);
      return;
    }

    // Ignore a late resolve after unmount or a space change, so state is never set from a stale space.
    let cancelled = false;
    const refresh = () =>
      void queryFacts(client.memory(spaceId)).then((result) => {
        if (!cancelled) {
          setFacts([...result]);
        }
      });

    refresh();
    const scope = Scope.makeUnsafe();
    void EffectEx.runPromise(client.rdf(spaceId).listen(refresh).pipe(Scope.provide(scope)));
    return () => {
      cancelled = true;
      void EffectEx.runPromise(Scope.close(scope, Exit.void));
    };
  }, [client, spaceId]);

  return facts;
};
