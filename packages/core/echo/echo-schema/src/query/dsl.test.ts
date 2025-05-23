//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { describe, expect, test } from 'vitest';

import { QueryAST } from '@dxos/echo-protocol';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';

import { Filter, Query } from './dsl';
import { EchoObject, EchoRelation } from '../ast';
import { create } from '../object';
import { Ref } from '../ref';

// TODO(dmaretskyi): Move those out.
const Type = {
  def: EchoObject,
};
const Relation = {
  def: EchoRelation,
};

//
// Example schema
//

// TODO(dmaretskyi): Need common set of test types.
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
  assignee: Schema.optional(Ref(Person)),
}).pipe(Type.def({ typename: 'dxos.org/type/Task', version: '0.1.0' }));
interface Task extends Schema.Schema.Type<typeof Task> {}

//
// Example queries
//

describe('query api', () => {
  test('get all people', () => {
    const getAllPeople = Query.type(Person);

    log('query', { ast: getAllPeople.ast });
    Schema.validateSync(QueryAST.Query)(getAllPeople.ast);
    console.log('getAllPeople', JSON.stringify(getAllPeople.ast, null, 2));
  });

  test('get all people named Fred', () => {
    const PeopleNamedFred = Query.select(Filter.type(Person, { name: 'Fred' }));

    log('query', { ast: PeopleNamedFred.ast });
    Schema.validateSync(QueryAST.Query)(PeopleNamedFred.ast);
    console.log('PeopleNamedFred', JSON.stringify(PeopleNamedFred.ast, null, 2));
  });

  test('get all orgs Fred worked for since 2020', () => {
    const fred = create(Person, { name: 'Fred' });
    const OrganizationsFredWorkedForSince2020 = Query.select(Filter.type(Person, { id: fred.id }))
      .sourceOf(WorksFor, { since: Filter.gt('2020') })
      .target();

    log('query', { ast: OrganizationsFredWorkedForSince2020.ast });
    Schema.validateSync(QueryAST.Query)(OrganizationsFredWorkedForSince2020.ast);
    console.log(
      'OrganizationsFredWorkedForSince2020',
      JSON.stringify(OrganizationsFredWorkedForSince2020.ast, null, 2),
    );
  });

  test('get all tasks for Fred', () => {
    const fred = create(Person, { name: 'Fred' });
    const TasksForFred = Query.select(Filter.type(Person, { id: fred.id })).referencedBy(Task, 'assignee');

    log('query', { ast: TasksForFred.ast });
    Schema.validateSync(QueryAST.Query)(TasksForFred.ast);
    console.log('TasksForFred', JSON.stringify(TasksForFred.ast, null, 2));
  });

  test('get all tasks for employees of Cyberdyne', () => {
    const TasksForEmployeesOfCyberdyne = Query.select(Filter.type(Organization, { name: 'Cyberdyne' }))
      .targetOf(WorksFor)
      .source()
      .referencedBy(Task, 'assignee');

    log('query', { ast: TasksForEmployeesOfCyberdyne.ast });
    Schema.validateSync(QueryAST.Query)(TasksForEmployeesOfCyberdyne.ast);
    console.log('TasksForEmployeesOfCyberdyne', JSON.stringify(TasksForEmployeesOfCyberdyne.ast, null, 2));
  });

  test('get all people or orgs', () => {
    const PeopleOrOrganizations = Query.all(Query.select(Filter.type(Person)), Query.select(Filter.type(Organization)));

    log('query', { ast: PeopleOrOrganizations.ast });
    Schema.validateSync(QueryAST.Query)(PeopleOrOrganizations.ast);
    console.log('PeopleOrOrganizations', JSON.stringify(PeopleOrOrganizations.ast, null, 2));
  });

  test('get assignees of all tasks created after 2020', () => {
    const AssigneesOfAllTasksCreatedAfter2020 = Query.select(
      Filter.type(Task, { createdAt: Filter.gt('2020') }),
    ).reference('assignee');

    log('query', { ast: AssigneesOfAllTasksCreatedAfter2020.ast });
    Schema.validateSync(QueryAST.Query)(AssigneesOfAllTasksCreatedAfter2020.ast);
    console.log(
      'AssigneesOfAllTasksCreatedAfter2020',
      JSON.stringify(AssigneesOfAllTasksCreatedAfter2020.ast, null, 2),
    );
  });

  test('contact full-text search', () => {
    const contactFullTextSearch = Query.select(Filter.text(Person, 'Bill'));

    log('query', { ast: contactFullTextSearch.ast });
    Schema.validateSync(QueryAST.Query)(contactFullTextSearch.ast);
    console.log('contactFullTextSearch', JSON.stringify(contactFullTextSearch.ast, null, 2));
  });

  test('filter by ref', () => {
    const fred = create(Person, { name: 'Fred' });
    const tasksByFred = Filter.type(Task, { assignee: Ref.make(fred) });
    expect(tasksByFred.ast).toEqual({
      props: {
        assignee: {
          operator: 'eq',
          type: 'compare',
          value: {
            '/': DXN.fromLocalObjectId(fred.id).toString(),
          },
        },
      },
      type: 'object',
      typename: 'dxn:type:dxos.org/type/Task:0.1.0',
    });
    console.log('tasksByFred', JSON.stringify(tasksByFred.ast, null, 2));
  });

  test('select orgs and people', () => {
    const orgsAndPeople = Query.select(Filter.or(Filter.type(Organization), Filter.type(Person)));

    Schema.validateSync(QueryAST.Query)(orgsAndPeople.ast);
    expect(orgsAndPeople.ast).toMatchInlineSnapshot(`
      {
        "filter": {
          "filters": [
            {
              "id": undefined,
              "props": {},
              "type": "object",
              "typename": "dxn:type:dxos.org/type/Organization:0.1.0",
            },
            {
              "id": undefined,
              "props": {},
              "type": "object",
              "typename": "dxn:type:dxos.org/type/Person:0.1.0",
            },
          ],
          "type": "or",
        },
        "type": "select",
      }
    `);
  });

  test('select everything but orgs and people', () => {
    const everythingButOrgsAndPeople = Query.select(
      Filter.not(Filter.or(Filter.type(Organization), Filter.type(Person))),
    );

    Schema.validateSync(QueryAST.Query)(everythingButOrgsAndPeople.ast);
    expect(everythingButOrgsAndPeople.ast).toMatchInlineSnapshot(`
      {
        "filter": {
          "filter": {
            "filters": [
              {
                "id": undefined,
                "props": {},
                "type": "object",
                "typename": "dxn:type:dxos.org/type/Organization:0.1.0",
              },
              {
                "id": undefined,
                "props": {},
                "type": "object",
                "typename": "dxn:type:dxos.org/type/Person:0.1.0",
              },
            ],
            "type": "or",
          },
          "type": "not",
        },
        "type": "select",
      }
    `);
  });

  test('select deleted tasks', () => {
    const deletedTasks = Query.select(Filter.type(Task)).options({
      deleted: 'only',
    });

    Schema.validateSync(QueryAST.Query)(deletedTasks.ast);
    expect(deletedTasks.ast).toMatchInlineSnapshot(`
      {
        "options": {
          "deleted": "only",
        },
        "query": {
          "filter": {
            "id": undefined,
            "props": {},
            "type": "object",
            "typename": "dxn:type:dxos.org/type/Task:0.1.0",
          },
          "type": "select",
        },
        "type": "options",
      }
    `);
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

    log('stuff', { fOr: or, fAnd: and, q, y });
  });
});
