//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Scope from 'effect/Scope';
import { describe, onTestFinished, test, vi } from 'vitest';

import { Fact, Graph, MemoryQuery, type MemoryService, type RdfStore } from '@dxos/echo-memory';
import * as LocalRdfStore from '@dxos/echo-memory-sqlite/LocalRdfStore';
import * as RdfMemory from '@dxos/echo-memory-sqlite/RdfMemory';
import * as FactFeed from '@dxos/echo-memory/FactFeed';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { TestBuilder, type TestPeer } from '@dxos/feed/testing';
import { SpaceId } from '@dxos/keys';
import { QuadStore } from '@dxos/sparql-sqlite/async';
import { layerMemory } from '@dxos/sql-sqlite/Platform';

import { factFeedLog } from './fact-feed.ts';

const said = (id: string, speaker: string, object: string): Fact.Fact =>
  Fact.make({
    id,
    assertion: {
      subject: { kind: 'entity', entity: speaker },
      predicate: 'works on',
      object: { kind: 'entity', entity: object },
    },
    factuality: { value: 'CT+', polarity: '+' },
    attribution: { agent: speaker, source: `chat:general/${id}`, generatedAtTime: new Date(0).toISOString() },
    recordedAt: new Date(0).toISOString(),
    extractor: { id: 'test', model: 'none', version: '1' },
    sourceHash: id,
  });

/** A TriG file as a user would import it: another store's memory, exported. */
const makeTrig = (): Promise<Uint8Array> =>
  Effect.gen(function* () {
    const store = yield* LocalRdfStore.make();
    yield* (yield* RdfMemory.make(store)).put([said('f1', 'dima', 'indexer'), said('f2', 'rich', 'ui')]);
    return yield* store.export('trig', { prefixes: Graph.EXPORT_PREFIXES });
  }).pipe(Effect.scoped, Effect.provide(layerMemory), Effect.orDie, Effect.runPromise);

type Replica = { readonly rdf: RdfStore.Service; readonly memory: MemoryService.Service };

/** A peer's copy of the space's memory, opened over its own database and its own replica of the space's fact feed. */
const openReplica = (peer: TestPeer, spaceId: SpaceId): Promise<Replica> => {
  const scope = Scope.makeUnsafe();
  onTestFinished(() => peer.runtime.runPromise(Scope.close(scope, Exit.void)));
  return Effect.gen(function* () {
    const log = yield* factFeedLog({ feeds: peer.feedStore, spaceId, feedId: FactFeed.feedId(spaceId) });
    const rdf = LocalRdfStore.fromQuadStore(yield* QuadStore.make({ prefix: 'rdf_test_', log }));
    return { rdf, memory: yield* RdfMemory.make(rdf) };
  }).pipe(Scope.provide(scope), RuntimeProvider.runPromise(peer.runtime.contextEffect));
};

const run = <A, E>(peer: TestPeer, effect: Effect.Effect<A, E>): Promise<A> =>
  effect.pipe(RuntimeProvider.runPromise(peer.runtime.contextEffect));

const factIds = (peer: TestPeer, { memory }: Replica) =>
  run(peer, memory.query(MemoryQuery.facts()).pipe(Effect.map((facts) => facts.map(({ id }) => id).sort())));

const quadCount = (peer: TestPeer, { rdf }: Replica) =>
  run(
    peer,
    rdf
      .query('SELECT (COUNT(*) AS ?n) WHERE { GRAPH ?g { ?s ?p ?o } }')
      .pipe(Effect.map(([row]) => Number(row?.n?.value))),
  );

describe('a TriG import replicates through the fact feed', () => {
  // Peer 2 joins after the import: its memory opens on the replicated feed (it opened the space once replication had
  // caught up) or before anything arrived (it opened the memory view at once and caught up live).
  test.for([
    ['after replication', 'after'],
    ['before replication', 'before'],
  ] as const)('a peer that joins later can query it when its memory opens %s', async ([, order], { expect }) => {
    const spaceId = SpaceId.random();
    // Peer 0 stands in for EDGE, through which a space's fact feed replicates.
    const builder = new TestBuilder({ numPeers: 3, spaceId, feedNamespace: FactFeed.NAMESPACE });
    await builder.open();
    onTestFinished(async () => {
      await builder.close();
    });
    const [, inviter, invitee] = builder.peers;

    const first = await openReplica(inviter, spaceId);
    const { quads } = await run(inviter, first.rdf.import(await makeTrig(), 'trig'));
    expect(quads).toBeGreaterThan(0);
    expect(await factIds(inviter, first)).toEqual(['f1', 'f2']);
    await builder.push(inviter);

    const early = order === 'before' ? await openReplica(invitee, spaceId) : undefined;
    if (early) {
      expect(await factIds(invitee, early)).toEqual([]);
    }
    await builder.pull(invitee);
    const replica = early ?? (await openReplica(invitee, spaceId));

    await vi.waitFor(async () => expect(await factIds(invitee, replica)).toEqual(['f1', 'f2']));
    expect(await quadCount(invitee, replica)).toBe(await quadCount(inviter, first));
  });
});
