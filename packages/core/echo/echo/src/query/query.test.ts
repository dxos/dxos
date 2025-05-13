//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { describe, test } from 'vitest';

import { create } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { Query } from './api';
import { Type, Relation } from '..';

//
// Example schema
//

const Person = Schema.Struct({
  name: Schema.String,
  email: Schema.optional(Schema.String),
}).pipe(Type.def({ typename: 'dxos.org/type/Person', version: '0.1.0' }));
interface Person extends Schema.Schema.Type<typeof Person> {}

const Org = Schema.Struct({
  name: Schema.String,
}).pipe(Type.def({ typename: 'dxos.org/type/Org', version: '0.1.0' }));
interface Org extends Schema.Schema.Type<typeof Org> {}

const WorksFor = Schema.Struct({
  since: Schema.String,
}).pipe(Relation.def({ typename: 'dxos.org/type/WorksFor', version: '0.1.0', source: Person, target: Org }));
interface WorksFor extends Schema.Schema.Type<typeof WorksFor> {}

const Task = Schema.Struct({
  title: Schema.String,
  createdAt: Schema.String,
  assignee: Type.Ref(Person),
}).pipe(Type.def({ typename: 'dxos.org/type/Task', version: '0.1.0' }));
interface Task extends Schema.Schema.Type<typeof Task> {}

//
// Example queries
//

describe('query api', () => {
  test('get all people', () => {
    // Query<Person>
    const getAllPeople = Query.type(Person);

    log.info('query', { ast: getAllPeople.ast });
  });

  test('get all people named Fred', () => {
    // Query<Person>
    const getAllPeopleNamedFred = Query.type(Person, { name: 'Fred' });

    log.info('query', { ast: getAllPeopleNamedFred.ast });
  });

  test('get all orgs Fred worked for since 2020', () => {
    // Query<Org>
    const fred = create(Person, { name: 'Fred' });
    const getAllOrgsFredWorkedForSince2020 = Query.type(Person, { id: fred.id })
      .sourceOf(WorksFor, { since: Query.gt('2020') })
      .target();

    log.info('query', { ast: getAllOrgsFredWorkedForSince2020.ast });
  });

  test('get all tasks for Fred', () => {
    // Query<Task>
    const fred = create(Person, { name: 'Fred' });
    const getAllTasksForFred = Query.type(Person, { id: fred.id }).referencedBy(Task, 'assignee');

    log.info('query', { ast: getAllTasksForFred.ast });
  });

  test('get all tasks for employees of Cyberdyne', () => {
    // Query<Task>
    const allTasksForEmployeesOfCyberdyne = Query.type(Org, { name: 'Cyberdyne' })
      .targetOf(WorksFor)
      .source()
      .referencedBy(Task, 'assignee');

    log.info('query', { ast: allTasksForEmployeesOfCyberdyne.ast });
  });

  test('get all people or orgs', () => {
    // Query<Person | Org>
    const allPeopleOrOrgs = Query.all(Query.type(Person), Query.type(Org));

    log.info('query', { ast: allPeopleOrOrgs.ast });
  });

  test('get assignees of all tasks created after 2020', () => {
    // Query<Person>
    const assigneesOfAllTasksCreatedAfter2020 = Query.type(Task, { createdAt: Query.gt('2020') }).reference('assignee');

    log.info('query', { ast: assigneesOfAllTasksCreatedAfter2020.ast });
  });

  test('contact full-text search', () => {
    // Query<Person>
    const contactFullTextSearch = Query.text(Person, 'Bill');

    log.info('query', { ast: contactFullTextSearch.ast });
  });

  // TODO(burdon): Experimental.
  test.skip('chain', () => {
    const db: any = null;
    const Query: any = null;
    const Filter: any = null;

    const x = db.exec(Query.select({ id: '123' })).first();
    const y = db.exec(Query.select(Filter.type(Person)).first());

    const q = Query
      //
      .selectAll()
      .select({ id: '123' })
      // NOTE: Can't support functions since they can't be serialized (to server).
      // .filter((object) => Math.random() > 0.5)
      .select(Filter.type(Person))
      .select(Filter.props({ name: 'Fred' }))
      .select({ age: Filter.gt(40) })
      .select({ date: Filter.between(Date.now(), Date.now() + 1000 * 60 * 60 * 24) })
      .select({ id: Filter.in(['1', '2', '3']) })
      .select(Filter.and(Filter.type(Person), Filter.props({ id: Filter.in(['1', '2', '3']) })))
      .target()
      .select();

    log.info('stuff', { x, y, q });
  });
});
