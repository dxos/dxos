//
// Copyright 2026 DXOS.org
//

import { type Database } from '@dxos/echo';

import { employeesOf, people, search } from '../queries.ts';
import { type Organization } from '../schema.ts';

declare const db: Database.Database;
declare const northwind: Organization;

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
// #endregion

unsubscribe();

export { matches, staff };
