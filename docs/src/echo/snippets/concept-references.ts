//
// Copyright 2026 DXOS.org
//

import { type Database, EID, Obj, Ref, Type } from '@dxos/echo';

import { Event, Organization, Person } from '../../echo-tutorial/schema.ts';

declare const db: Database.Database;

// #region names
const typeName = Type.getURI(Person); // dxn:com.example.type.person:0.1.0

const ada = db.add(Obj.make(Person, { name: 'Ada' }));
const local = EID.make({ entityId: ada.id }); // echo:///<objectId>
// echo://<spaceId>/<objectId>
const qualified = EID.make({ spaceId: db.spaceId, entityId: ada.id });
// #endregion names

// #region resolve
const acme = db.add(Obj.make(Organization, { name: 'Acme' }));
const grace = db.add(
  Obj.make(Person, { name: 'Grace', employer: Ref.make(acme) }),
);
const launch = db.add(
  Obj.make(Event, {
    title: 'Launch',
    attendees: [Ref.make(ada), Ref.make(grace)],
  }),
);

// The target if it is in memory. Never starts a load.
const inMemory = grace.employer?.peek();
// Reads the target from disk or the network.
const employer = await grace.employer?.load();
// Loads every target, and leaves out the missing and removed ones.
const attendees = await Ref.loadAll(launch.attendees ?? []);
// #endregion resolve

export { attendees, employer, inMemory, local, qualified, typeName };
