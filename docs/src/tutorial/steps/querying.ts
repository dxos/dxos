//
// Copyright 2026 DXOS.org
//

import { type Database } from '@dxos/echo';

import { employeesOf, people, search } from '../queries.ts';
import { addOrganization, addPerson } from '../records.ts';

declare const db: Database.Database;
const northwind = addOrganization(db, { name: 'Northwind Labs' });
addPerson(db, { name: 'Ada Lovelace', employer: northwind });

// #region run
const everyone = await db.query(people).run();
console.log(everyone.map((person) => person.name));
// #endregion

// #region search
const matches = await db.query(search('Northwind')).run();
// #endregion

// #region employees
const staff = await db.query(employeesOf(northwind)).run();
// #endregion

// #region live
const unsubscribe = db.query(people).subscribe(({ results }) => {
  console.log(`${results.length} people`);
});

addPerson(db, { name: 'Grace Hopper' });
unsubscribe();
// #endregion

export { matches, staff };
