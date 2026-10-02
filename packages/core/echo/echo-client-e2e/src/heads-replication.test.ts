//
// Copyright 2026 DXOS.org
//

import { next as A, type Doc as AutomergeDoc } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Context } from '@dxos/context';
import { DXN, Filter, Obj, Query, Type } from '@dxos/echo';
import { EchoTestBuilder, getObjectCore } from '@dxos/echo-client/testing';
import { TestReplicationNetwork, type TestReplicator } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { setDeep } from '@dxos/util';

class Note extends Type.makeObject<Note>(DXN.make('org.dxos.test.heads-replication.Note', '0.1.0'))(
  Schema.Struct({ title: Schema.optional(Schema.String) }),
) {}

describe('waitUntilHeadsReplicated', () => {
  let builder: EchoTestBuilder;
  let network: TestReplicationNetwork | undefined;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
    await network?.close();
    network = undefined;
  });

  test('resolves when the awaited change merges into an already-conflicted key', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    network = await new TestReplicationNetwork().open();
    const peer1 = await builder.createPeer({ types: [Note] });
    const peer2 = await builder.createPeer({ types: [Note] });
    const connect = async (): Promise<[TestReplicator, TestReplicator]> => {
      invariant(network, 'network');
      const replicators: [TestReplicator, TestReplicator] = [
        await network.createReplicator(),
        await network.createReplicator(),
      ];
      await peer1.host.addReplicator(Context.default(), replicators[0]);
      await peer2.host.addReplicator(Context.default(), replicators[1]);
      return replicators;
    };
    const [replicator1, replicator2] = await connect();

    await using db1 = await peer1.createDatabase(spaceKey);
    const note1 = db1.add(Obj.make(Note, { title: 'initial' }));
    await db1.flush();
    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    let replicated: Note | undefined;
    await expect
      .poll(async () => {
        [replicated] = await db2.query(Query.select(Filter.id(note1.id))).run();
        return replicated;
      })
      .toBeDefined();
    invariant(replicated, 'replicated note');
    const note2 = replicated;

    await peer1.host.removeReplicator(replicator1);
    await peer2.host.removeReplicator(replicator2);

    // Peer1 conflicts the key locally and holds the higher counter, so peer2's concurrent write
    // arrives as a losing third value: heads move but the merge emits no patch at all.
    const baseHeads = A.getHeads(getObjectCore(note1).getDoc());
    Obj.update(note1, (note1) => {
      note1.title = 'first';
    });
    Obj.update(note1, (note1) => {
      note1.title = 'winner';
    });
    const accessor = getObjectCore(note1).getDocAccessor(['title']);
    accessor.handle.changeAt(baseHeads, (doc: AutomergeDoc<unknown>) => {
      setDeep(doc, accessor.path.slice(), 'side');
    });
    await db1.flush();
    const presented = note1.title;
    Obj.update(note2, (note2) => {
      note2.title = 'loser';
    });
    await db2.flush();

    await connect();
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await expect.poll(() => note2.title).toBe(presented);
    expect(note1.title).toBe(presented);
  });
});
