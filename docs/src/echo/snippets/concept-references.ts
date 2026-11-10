//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Database, DXN, EID, Obj, Ref, Type } from '@dxos/echo';

class Person extends Type.makeObject<Person>(DXN.make('com.example.type.person', '0.1.0'))({ name: Schema.String }) {}

declare const db: Database.Database;
declare const otherSpace: Database.Database;

// #region names
const typeName = Type.getURI(Person); // dxn:com.example.type.person:0.1.0

const ada = db.add(Obj.make(Person, { name: 'Ada' }));
const local = EID.make({ entityId: ada.id }); // echo:///<objectId>
const qualified = EID.make({ spaceId: db.spaceId, entityId: ada.id }); // echo://<spaceId>/<objectId>
// #endregion names

// #region cross-space
// A reference into another space carries that space's id.
const remote = otherSpace.add(Obj.make(Person, { name: 'Grace' }));
const toRemote = db.makeRef<Person>(EID.make({ spaceId: otherSpace.spaceId, entityId: remote.id }));
const grace = await toRemote.tryLoad(); // undefined if this device cannot reach it
// #endregion cross-space

export { grace, local, qualified, Ref, typeName };
