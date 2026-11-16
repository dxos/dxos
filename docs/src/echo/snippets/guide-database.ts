//
// Copyright 2026 DXOS.org
//

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj, Query, Type } from '@dxos/echo';

import { Event, Person } from '../../echo-tutorial/schema.ts';

declare const client: Client;
declare const space: Space;

// #region get
const db = space.db;
// #endregion get

// #region write
const ada = db.add(Obj.make(Person, { name: 'Ada' }));
db.remove(ada);
// #endregion write

// #region query
const people = await db.query(Query.select(Filter.type(Person))).run();
// #endregion query

// #region flush
await db.flush(); // pending writes are on disk
await db.flush({ indexes: true, updates: true }); // and queries see them
// #endregion flush

// #region types
const Note = Type.makeObjectFromJsonSchema({
  typename: 'com.example.type.note',
  version: '0.1.0',
  jsonSchema: { type: 'object', properties: { title: { type: 'string' } } },
});
const persisted = await db.addType(Note); // replicates to the other members
// #endregion types

// #region branches
const launch = db.add(Obj.make(Event, { title: 'Launch' }));
await db.createBranch(launch.id, 'draft');
db.listBranches(launch.id); // ['main', 'draft']

await db.switchBranch(launch.id, 'draft'); // this device only
await db.switchBranch(launch.id, 'main');
await db.mergeBranch(launch.id, 'draft', { deleteAfter: true });
// #endregion branches

// #region hypergraph
const everyone = await client.graph
  .query(Query.select(Filter.type(Person)).from('all-accessible-spaces'))
  .run();
const sameDb = client.graph.getDatabase(space.id);
// #endregion hypergraph

// #region sync
const state = await db.getSyncState();
const unsubscribe = db.subscribeToSyncState((state) => console.log(state));
unsubscribe();
// #endregion sync

export { everyone, people, persisted, sameDb, state };
