//
// Copyright 2026 DXOS.org
//

import { type Database, EID, Obj, Ref, Type } from '@dxos/echo';

import { Person } from '../../tutorial/schema.ts';

declare const db: Database.Database;

// #region names
const typeName = Type.getURI(Person); // dxn:com.example.type.person:0.1.0

const ada = db.add(Obj.make(Person, { name: 'Ada' }));
const local = EID.make({ entityId: ada.id }); // echo:///<objectId>
// echo://<spaceId>/<objectId>
const qualified = EID.make({ spaceId: db.spaceId, entityId: ada.id });
// #endregion names

export { Ref, local, qualified, typeName };
