//
// Copyright 2026 DXOS.org
//

import { type Database, Obj, Ref } from '@dxos/echo';

import { Organization, Person } from '../schema.ts';

declare const db: Database.Database;

// #region add
const northwind = db.add(Obj.make(Organization, { name: 'Northwind Labs' }));
const ada = db.add(Obj.make(Person, { name: 'Ada Lovelace', employer: Ref.make(northwind) }));
// #endregion

// #region subscribe
const unsubscribe = Obj.subscribe(ada, () => {
  console.log(ada.employer?.peek()?.name);
});
// #endregion

// #region update
const halcyon = db.add(Obj.make(Organization, { name: 'Halcyon Robotics' }));
Obj.update(ada, (ada) => {
  ada.employer = Ref.make(halcyon);
});
// #endregion

unsubscribe();

// #region remove
db.remove(ada);
// #endregion
