//
// Copyright 2026 DXOS.org
//

import { type Database, Obj } from '@dxos/echo';

import { addOrganization, addPerson, changeEmployer, removeRecord } from '../records.ts';

declare const db: Database.Database;

// #region add
const northwind = addOrganization(db, { name: 'Northwind Labs' });
const ada = addPerson(db, { name: 'Ada Lovelace', employer: northwind });
// #endregion

// #region subscribe
const employers: (string | undefined)[] = [];
const unsubscribe = Obj.subscribe(ada, () => {
  employers.push(ada.employer?.peek()?.name);
});
// #endregion

// #region update
const halcyon = addOrganization(db, { name: 'Halcyon Robotics' });
changeEmployer(ada, halcyon);
// #endregion

unsubscribe();

// #region remove
removeRecord(db, ada);
// #endregion

export { employers };
