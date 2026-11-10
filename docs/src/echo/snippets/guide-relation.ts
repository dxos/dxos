//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Database, DXN, Filter, Obj, Query, Relation, Type } from '@dxos/echo';

class Person extends Type.makeObject<Person>(DXN.make('com.example.type.person', '0.1.0'))({ name: Schema.String }) {}
class Company extends Type.makeObject<Company>(DXN.make('com.example.type.company', '0.1.0'))({
  name: Schema.String,
}) {}
class WorksFor extends Type.makeRelation<WorksFor>(DXN.make('com.example.type.worksFor', '0.1.0'))({
  source: Person,
  target: Company,
})({ role: Schema.String }) {}

declare const db: Database.Database;

// #region make
const ada = db.add(Obj.make(Person, { name: 'Ada' }));
const acme = db.add(Obj.make(Company, { name: 'Acme' }));

const job = db.add(
  Relation.make(WorksFor, {
    [Relation.Source]: ada,
    [Relation.Target]: acme,
    role: 'Engineer',
  }),
);
// #endregion make

// #region endpoints
const employee = Relation.getSource(job); // Person
const employer = Relation.getTarget(job); // Company
const employerUri = Relation.getTargetURI(job);
// #endregion endpoints

// #region query
const jobsAtAcme = await db.query(Query.select(Filter.id(acme.id)).targetOf(WorksFor)).run();
const people = await db.query(Query.select(Filter.id(acme.id)).targetOf(WorksFor).source()).run();
// #endregion query

// #region update
Relation.update(job, (job) => {
  job.role = 'Staff engineer';
});

const unsubscribe = Relation.subscribe(job, () => console.log(job.role));
unsubscribe();

const sorted = jobsAtAcme.sort(Relation.sort(Relation.sortByLabel, Relation.sortByTypename));
// #endregion update

export { employee, employer, employerUri, people, sorted };
