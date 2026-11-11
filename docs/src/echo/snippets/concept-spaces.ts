//
// Copyright 2026 DXOS.org
//

import { type Client } from '@dxos/client';
import { EID, Filter, Obj, Query } from '@dxos/echo';

import { Person } from '../../tutorial/schema.ts';

declare const client: Client;

// #region database
const space = await client.spaces.create();
const db = space.db;
db.add(Obj.make(Person, { name: 'Ada' }));
// #endregion database

// #region hypergraph
// Every space this device holds, in one query.
const everyone = await client.graph
  .query(Query.select(Filter.type(Person)).from('all-accessible-spaces'))
  .run();

// One space's database, by id.
const same = client.graph.getDatabase(space.id);
// #endregion hypergraph

// #region cross-space
// A reference into another space carries that space's id.
const other = await client.spaces.create();
const grace = other.db.add(Obj.make(Person, { name: 'Grace' }));
const toGrace = db.makeRef<Person>(
  EID.make({ spaceId: other.id, entityId: grace.id }),
);
// undefined if this device cannot reach the space
const loaded = await toGrace.tryLoad();
// #endregion cross-space

export { everyone, loaded, same };
