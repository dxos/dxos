//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { describe, test } from 'vitest';

import { create } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { Filter, Query } from './api';
import * as QueryAST from './ast';
import { Relation, Type } from '..';

//
// Example schema
//

const Person = Schema.Struct({
  name: Schema.String,
  email: Schema.optional(Schema.String),
  age: Schema.optional(Schema.Number),
}).pipe(
  Type.def({
    typename: 'dxos.org/type/Person',
    version: '0.1.0',
  }),
);
interface Person extends Schema.Schema.Type<typeof Person> {}

const Organization = Schema.Struct({
  name: Schema.String,
}).pipe(
  Type.def({
    typename: 'dxos.org/type/Organization',
    version: '0.1.0',
  }),
);
interface Organization extends Schema.Schema.Type<typeof Organization> {}

const WorksFor = Schema.Struct({
  since: Schema.String,
}).pipe(
  Relation.def({
    typename: 'dxos.org/type/WorksFor',
    version: '0.1.0',
    source: Person,
    target: Organization,
  }),
);
interface WorksFor extends Schema.Schema.Type<typeof WorksFor> {}

const Task = Schema.Struct({
  title: Schema.String,
  createdAt: Schema.String,
  assignee: Type.Ref(Person),
}).pipe(
  Type.def({
    typename: 'dxos.org/type/Task',
    version: '0.1.0',
  }),
);
interface Task extends Schema.Schema.Type<typeof Task> {}

//
// Example queries
//

describe('query api', () => {
  test('get all people', () => {
    const getAllPeople = Query.type(Person);

    log.info('query', { ast: getAllPeople.ast });
    Schema.validateSync(QueryAST.Query)(getAllPeople.ast);
  });

  test('get all people named Fred', () => {
    const PeopleNamedFred = Query.select(Filter.type(Person, { name: 'Fred' }));

    log.info('query', { ast: PeopleNamedFred.ast });
    Schema.validateSync(QueryAST.Query)(PeopleNamedFred.ast);
  });

  test('get all orgs Fred worked for since 2020', () => {
    const fred = create(Person, { name: 'Fred' });
    const OrganizationsFredWorkedForSince2020 = Query.select(Filter.type(Person, { id: fred.id }))
      .sourceOf(WorksFor, { since: Filter.gt('2020') })
      .target();

    log.info('query', { ast: OrganizationsFredWorkedForSince2020.ast });
    Schema.validateSync(QueryAST.Query)(OrganizationsFredWorkedForSince2020.ast);
  });

  test('get all tasks for Fred', () => {
    const fred = create(Person, { name: 'Fred' });
    const TasksForFred = Query.select(Filter.type(Person, { id: fred.id })).referencedBy(Task, 'assignee');

    log.info('query', { ast: TasksForFred.ast });
    Schema.validateSync(QueryAST.Query)(TasksForFred.ast);
  });

  test('get all tasks for employees of Cyberdyne', () => {
    const TasksForEmployeesOfCyberdyne = Query.select(Filter.type(Organization, { name: 'Cyberdyne' }))
      .targetOf(WorksFor)
      .source()
      .referencedBy(Task, 'assignee');

    log.info('query', { ast: TasksForEmployeesOfCyberdyne.ast });
    Schema.validateSync(QueryAST.Query)(TasksForEmployeesOfCyberdyne.ast);
  });

  test('get all people or orgs', () => {
    const PeopleOrOrganizations = Query.all(Query.select(Filter.type(Person)), Query.select(Filter.type(Organization)));

    log.info('query', { ast: PeopleOrOrganizations.ast });
    Schema.validateSync(QueryAST.Query)(PeopleOrOrganizations.ast);
  });

  test('get assignees of all tasks created after 2020', () => {
    const AssigneesOfAllTasksCreatedAfter2020 = Query.select(
      Filter.type(Task, { createdAt: Filter.gt('2020') }),
    ).reference('assignee');

    log.info('query', { ast: AssigneesOfAllTasksCreatedAfter2020.ast });
    Schema.validateSync(QueryAST.Query)(AssigneesOfAllTasksCreatedAfter2020.ast);
  });

  test('contact full-text search', () => {
    const contactFullTextSearch = Query.select(Filter.text(Person, 'Bill'));

    log.info('query', { ast: contactFullTextSearch.ast });
    Schema.validateSync(QueryAST.Query)(contactFullTextSearch.ast);
  });

  test.skip('chain', () => {
    // NOTE: Can't support props without type since they can't be inferred.
    // const f1: Filter<Person> = Filter.props({ name: 'Fred' });

    // const x = Query.select(Filter.props({ id: '123' }));
    const y = Query.select(Filter.type(Person));

    const or = Filter.or(Filter.type(Person, { id: Filter.in('1', '2', '3') }), Filter.type(Organization));

    const and = Filter.and(
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

    log.info('stuff', { fOr: or, fAnd: and, q, y });
  });
});
