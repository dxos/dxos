//
// Copyright 2026 DXOS.org
//

import { type Database, Obj, Ref } from '@dxos/echo';

import { Event, Organization, Person } from '../../echo-tutorial/schema.ts';

declare const db: Database.Database;

// #region make
const acme = db.add(Obj.make(Organization, { name: 'Acme' }));
const ada = db.add(Obj.make(Person, { name: 'Ada', employer: Ref.make(acme) }));
const launch = db.add(
  Obj.make(Event, { title: 'Launch', attendees: [Ref.make(ada)] }),
);

// From a URI: bound to the database, so it can load.
const again = db.makeRef<Person>(Obj.getURI(ada));
// #endregion make

// #region resolve
const loaded = ada.employer?.peek(); // Organization | undefined, never loads
// loads from disk or the network if needed
const employer = await ada.employer?.load();
// undefined instead of throwing when the target is missing
const maybe = await again.tryLoad();
// missing and deleted targets are left out
const attendees = await Ref.loadAll(launch.attendees ?? []);
// #endregion resolve

// #region compare
const same =
  ada.employer !== undefined && Ref.equals(ada.employer, Ref.make(acme));
const attending = (launch.attendees ?? []).some(Ref.hasEntityId(ada.id));
Ref.isRef(ada.employer); // true
// #endregion compare

export { attendees, attending, employer, loaded, maybe, same };
