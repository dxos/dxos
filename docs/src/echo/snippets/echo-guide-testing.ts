//
// Copyright 2026 DXOS.org
//

import { Context } from '@dxos/context';
import { Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestReplicationNetwork } from '@dxos/echo-host/testing';
import { PublicKey } from '@dxos/keys';

import { Person, types } from '../../echo-tutorial/schema.ts';

// #region database
// In memory, with nothing to clean up on disk.
await using builder = await new EchoTestBuilder().open();
const { db } = await builder.createDatabase({ types });

db.add(Obj.make(Person, { name: 'Ada' }));
await db.flush({ indexes: true });
const people = await db.query(Filter.type(Person)).run();
// #endregion database

// #region peers
// Two peers, each with its own storage, joined by an in-memory network.
await using network = await new TestReplicationNetwork().open();
await using peer1 = await builder.createPeer({ types });
await using peer2 = await builder.createPeer({ types });
await peer1.host.addReplicator(
  Context.default(),
  await network.createReplicator(),
);
await peer2.host.addReplicator(
  Context.default(),
  await network.createReplicator(),
);

const spaceKey = PublicKey.random();
await using db1 = await peer1.createDatabase(spaceKey);
await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);

db1.add(Obj.make(Person, { name: 'Grace' }));
await db1.flush();

// Wait until peer 2 has every change peer 1 made.
await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
// #endregion peers

export { people };
