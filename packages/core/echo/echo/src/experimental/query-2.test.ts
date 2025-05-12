import { Schema } from 'effect';
import { Type } from '..';

declare const Relation: any;
declare const Query: any;

//
// Example schema
//

const Person = Schema.Struct({
  name: Schema.String,
}).pipe(Type.def({ typename: 'dxos.org/type/Person', version: '0.1.0' }));

const Org = Schema.Struct({
  name: Schema.String,
}).pipe(Type.def({ typename: 'dxos.org/type/Org', version: '0.1.0' }));

const WorksFor = Schema.Struct({
  since: Schema.String,
}).pipe(Relation.def({ typename: 'dxos.org/type/WorksFor', version: '0.1.0', source: Person, target: Org }));

const Task = Schema.Struct({
  title: Schema.String,
  assignee: Type.Ref(Person),
}).pipe(Type.def({ typename: 'dxos.org/type/Task', version: '0.1.0' }));

//
// Example queries
//

// Query<Person>
const getAllPeople = Query.type(Person);

// Query<Person>
const getAllPeopleNamedFred = Query.type(Person, { name: 'Fred' });

// Query<Org>
declare const fred: any;
const getAllOrgsFredWorkedForSince2020 = Query.type(Person, { id: fred.id })
  .outgoingRelations(WorksFor, { since: Query.gt('2020') })
  .targets();

// Query<Task>
const getAllTasksForFred = Query.type(Person, { id: fred.id }).referencedBy(Task, 'assignee');

// Query<Task>
const allTasksForEmployeesOfCyberdyne = Query.type(Org, { name: 'Cyberdyne' })
  .incomingRelations(WorksFor)
  .sources()
  .referencedBy(Task, 'assignee');

// Query<Person | Org>
const allPeopleOrOrgs = Query.all(Query.type(Person), Query.type(Org));
