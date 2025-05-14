//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { describe, test } from 'vitest';

import { create } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { Filter, Query } from './api';
import { Type, Relation } from '..';

//
// Example schema
//

const Person = Schema.Struct({
  name: Schema.String,
  email: Schema.optional(Schema.String),
  age: Schema.optional(Schema.Number),
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
    const getAllPeople = Query.select(Filter.type(Person));

    log.info('query', { ast: getAllPeople.ast });
  });

  test('get all people named Fred', () => {
    // Query<Person>
    const getAllPeopleNamedFred = Query.select(Filter.type(Person, { name: 'Fred' }));

    log.info('query', { ast: getAllPeopleNamedFred.ast });
  });

  test('get all orgs Fred worked for since 2020', () => {
    // Query<Org>
    const fred = create(Person, { name: 'Fred' });
    const getAllOrgsFredWorkedForSince2020 = Query.select(Filter.type(Person, { id: fred.id }))
      .sourceOf(WorksFor, { since: Filter.gt('2020') })
      .target();

    log.info('query', { ast: getAllOrgsFredWorkedForSince2020.ast });
  });

  test('get all tasks for Fred', () => {
    // Query<Task>
    const fred = create(Person, { name: 'Fred' });
    const getAllTasksForFred = Query.select(Filter.type(Person, { id: fred.id })).referencedBy(Task, 'assignee');

    log.info('query', { ast: getAllTasksForFred.ast });
  });

  test('get all tasks for employees of Cyberdyne', () => {
    // Query<Task>
    const allTasksForEmployeesOfCyberdyne = Query.select(Filter.type(Org, { name: 'Cyberdyne' }))
      .targetOf(WorksFor)
      .source()
      .referencedBy(Task, 'assignee');

    log.info('query', { ast: allTasksForEmployeesOfCyberdyne.ast });
  });

  test('get all people or orgs', () => {
    // Query<Person | Org>
    const allPeopleOrOrgs = Query.all(Query.select(Filter.type(Person)), Query.select(Filter.type(Org)));

    log.info('query', { ast: allPeopleOrOrgs.ast });
  });

  test('get assignees of all tasks created after 2020', () => {
    // Query<Person>
    const assigneesOfAllTasksCreatedAfter2020 = Query.select(
      Filter.type(Task, { createdAt: Filter.gt('2020') }),
    ).reference('assignee');

    log.info('query', { ast: assigneesOfAllTasksCreatedAfter2020.ast });
  });

  test('contact full-text search', () => {
    // Query<Person>
    const contactFullTextSearch = Query.select(Filter.text(Person, 'Bill'));

    log.info('query', { ast: contactFullTextSearch.ast });
  });

  test.skip('chain', () => {
    // const f1: Filter<Person> = Filter.props({ name: 'Fred' });

    // const x = Query.select(Filter.props({ id: '123' }));
    const y = Query.select(Filter.type(Person));

    const fOr = Filter.or(Filter.type(Person, { id: Filter.in('1', '2', '3') }), Filter.type(Org));

    const fAnd = Filter.and(
      Filter.type(Person, { id: Filter.in('1', '2', '3') }),
      Filter.type(Person, { name: 'Fred' }),
    );

    const q = Query
      //
      // NOTE: Can't support functions since they can't be serialized (to server).
      // .filter((object) => Math.random() > 0.5)
      .select(Filter.type(Person))
      .select(Filter.type(Person, { name: 'Fred' }))
      .select({ age: Filter.between(20, 40) })
      .select(Filter.and(Filter.type(Person), Filter.type(Person, { name: Filter.in('bob', 'bill') })));

    log.info('stuff', { fOr, fAnd, q, y });
  });
});
