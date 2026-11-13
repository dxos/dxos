//
// Copyright 2026 DXOS.org
//

import { type Database, Filter, Obj, Query, Relation } from '@dxos/echo';

import { Organization, Person } from '../../echo-tutorial/schema.ts';
import { WorksAt } from './works-at.ts';

declare const db: Database.Database;

// #region make
const ada = db.add(Obj.make(Person, { name: 'Ada' }));
const acme = db.add(Obj.make(Organization, { name: 'Acme' }));

const job = db.add(
  Relation.make(WorksAt, {
    [Relation.Source]: ada,
    [Relation.Target]: acme,
    role: 'Engineer',
  }),
);
// #endregion make

// #region endpoints
const employee = Relation.getSource(job); // Person
const employer = Relation.getTarget(job); // Organization
const employerUri = Relation.getTargetURI(job);
// #endregion endpoints

// #region query
const jobsAtAcme = await db
  .query(Query.select(Filter.id(acme.id)).targetOf(WorksAt))
  .run();
const staff = await db
  .query(Query.select(Filter.id(acme.id)).targetOf(WorksAt).source())
  .run();
// #endregion query

// #region update
Relation.update(job, (job) => {
  job.role = 'Staff engineer';
});

const unsubscribe = Relation.subscribe(job, () => console.log(job.role));
unsubscribe();

const sorted = jobsAtAcme.sort(
  Relation.sort(Relation.sortByLabel, Relation.sortByTypename),
);
// #endregion update

export { employee, employer, employerUri, sorted, staff };
