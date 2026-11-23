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

/** All facts of a memory, or none where the query fails, so the surface never crashes on an unreachable memory. */
const readFacts = (memory: MemoryService.Service): Effect.Effect<readonly Fact.Fact[]> =>
  memory.query(MemoryQuery.facts()).pipe(Effect.orElseSucceed((): readonly Fact.Fact[] => []));

/**
 * Reads all facts from a memory once. Extracted as a plain async function so the read path is unit-testable without
 * provisioning the full capability/render stack.
 */
export const queryFacts = (memory: MemoryService.Service): Promise<readonly Fact.Fact[]> =>
  EffectEx.runPromise(readFacts(memory));

/**
 * Reads all facts from a memory and hands them to `onFacts`, with nothing awaiting the read: the client's shutdown
 * interrupts a query still in flight, which must end quietly rather than as a rejection no one handles.
 */
export const refreshFacts = (memory: MemoryService.Service, onFacts: (facts: readonly Fact.Fact[]) => void): void =>
  EffectEx.runDetached(readFacts(memory).pipe(Effect.map(onFacts)));

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
      refreshFacts(client.memory(spaceId), (result) => {
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
