//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { QueryAST } from '@dxos/echo-protocol';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';

import * as Obj from '../Obj';
import * as Ref from '../Ref';

import { Filter } from './filter';
import { Order } from './order';
import { Query } from './query';
import * as Test from './testing';

describe('query api', () => {
  describe('Query', () => {
    test('get all people', () => {
      const getAllPeople = Query.type(Test.Person);

      log('query', { ast: getAllPeople.ast });
      Schema.validateSync(QueryAST.Query)(getAllPeople.ast);
      console.log('getAllPeople', JSON.stringify(getAllPeople.ast, null, 2));
    });

    test('get all people ordered by name', () => {
      const getAllPeopleOrderedByName = Query.type(Test.Person).orderBy(Order.property('name', 'asc'));

      log('query', { ast: getAllPeopleOrderedByName.ast });
      Schema.validateSync(QueryAST.Query)(getAllPeopleOrderedByName.ast);
      console.log('getAllPeopleOrderedByName', JSON.stringify(getAllPeopleOrderedByName.ast, null, 2));
    });

    test('get all people named Fred', () => {
      const PeopleNamedFred = Query.select(Filter.type(Test.Person, { name: 'Fred' }));

      log('query', { ast: PeopleNamedFred.ast });
      Schema.validateSync(QueryAST.Query)(PeopleNamedFred.ast);
      console.log('PeopleNamedFred', JSON.stringify(PeopleNamedFred.ast, null, 2));
    });

    test('get all people with field of "label" set to "Research"', () => {
      const PeopleWithFieldLabelSetToResearch = Query.select(
        Filter.type(Test.Person, { fields: Filter.contains({ label: 'label', value: 'Research' }) }),
      );

      log('query', { ast: PeopleWithFieldLabelSetToResearch.ast });
      Schema.validateSync(QueryAST.Query)(PeopleWithFieldLabelSetToResearch.ast);
      console.log('PeopleWithFieldLabelSetToResearch', JSON.stringify(PeopleWithFieldLabelSetToResearch.ast, null, 2));
    });

    test('get all orgs with property "label" set to "Research"', () => {
      const OrgsWithPropertyLabelSetToResearch = Query.select(
        Filter.type(Test.Organization, { properties: { label: 'Research' } }),
      );

      log('query', { ast: OrgsWithPropertyLabelSetToResearch.ast });
      Schema.validateSync(QueryAST.Query)(OrgsWithPropertyLabelSetToResearch.ast);
      console.log(
        'OrgsWithPropertyLabelSetToResearch',
        JSON.stringify(OrgsWithPropertyLabelSetToResearch.ast, null, 2),
      );
    });

    test('get all orgs Fred worked for since 2020', () => {
      const fred = Obj.make(Test.Person, { name: 'Fred' });
      const OrganizationsFredWorkedForSince2020 = Query.select(Filter.type(Test.Person, { id: fred.id }))
        .sourceOf(Test.WorksFor, { since: Filter.gt('2020') })
        .target();

      log('query', { ast: OrganizationsFredWorkedForSince2020.ast });
      Schema.validateSync(QueryAST.Query)(OrganizationsFredWorkedForSince2020.ast);
      console.log(
        'OrganizationsFredWorkedForSince2020',
        JSON.stringify(OrganizationsFredWorkedForSince2020.ast, null, 2),
      );
    });

    test('get all tasks for Fred', () => {
      const fred = Obj.make(Test.Person, { name: 'Fred' });
      const TasksForFred = Query.select(Filter.type(Test.Person, { id: fred.id })).referencedBy(Test.Task, 'assignee');

      log('query', { ast: TasksForFred.ast });
      Schema.validateSync(QueryAST.Query)(TasksForFred.ast);
      console.log('TasksForFred', JSON.stringify(TasksForFred.ast, null, 2));
    });

    test('get all tasks for employees of Cyberdyne', () => {
      const TasksForEmployeesOfCyberdyne = Query.select(Filter.type(Test.Organization, { name: 'Cyberdyne' }))
        .targetOf(Test.WorksFor)
        .source()
        .referencedBy(Test.Task, 'assignee');

      log('query', { ast: TasksForEmployeesOfCyberdyne.ast });
      Schema.validateSync(QueryAST.Query)(TasksForEmployeesOfCyberdyne.ast);
      console.log('TasksForEmployeesOfCyberdyne', JSON.stringify(TasksForEmployeesOfCyberdyne.ast, null, 2));
    });

    test('get all people or orgs', () => {
      const PeopleOrOrganizations = Query.all(
        Query.select(Filter.type(Test.Person)),
        Query.select(Filter.type(Test.Organization)),
      );

      log('query', { ast: PeopleOrOrganizations.ast });
      Schema.validateSync(QueryAST.Query)(PeopleOrOrganizations.ast);
      console.log('PeopleOrOrganizations', JSON.stringify(PeopleOrOrganizations.ast, null, 2));
    });

    test('get all people not in orgs', () => {
      const PeopleNotInOrganizations = Query.without(
        Query.select(Filter.type(Test.Person)),
        Query.select(Filter.type(Test.Person)).sourceOf(Test.WorksFor).source(),
      );

      log('query', { ast: PeopleNotInOrganizations.ast });
      Schema.validateSync(QueryAST.Query)(PeopleNotInOrganizations.ast);
      console.log('PeopleNotInOrganizations', JSON.stringify(PeopleNotInOrganizations.ast, null, 2));
    });

    test('get assignees of all tasks created after 2020', () => {
      const AssigneesOfAllTasksCreatedAfter2020 = Query.select(
        Filter.type(Test.Task, { createdAt: Filter.gt('2020') }),
      ).reference('assignee');

      log('query', { ast: AssigneesOfAllTasksCreatedAfter2020.ast });
      Schema.validateSync(QueryAST.Query)(AssigneesOfAllTasksCreatedAfter2020.ast);
      console.log(
        'AssigneesOfAllTasksCreatedAfter2020',
        JSON.stringify(AssigneesOfAllTasksCreatedAfter2020.ast, null, 2),
      );
    });

    test('untyped full-text search', () => {
      const contactFullTextSearch = Query.select(Filter.text('Bill'));

      log('query', { ast: contactFullTextSearch.ast });
      Schema.validateSync(QueryAST.Query)(contactFullTextSearch.ast);
      expect(contactFullTextSearch.ast).toMatchInlineSnapshot(`
      {
        "filter": {
          "searchKind": undefined,
          "text": "Bill",
          "type": "text-search",
        },
        "type": "select",
      }
    `);
    });

    test('typed full-text search', () => {
      const contactFullTextSearch = Query.select(Filter.type(Test.Person)).select(Filter.text('Bill'));

      log('query', { ast: contactFullTextSearch.ast });
      Schema.validateSync(QueryAST.Query)(contactFullTextSearch.ast);
      expect(contactFullTextSearch.ast).toMatchInlineSnapshot(`
      {
        "filter": {
          "searchKind": undefined,
          "text": "Bill",
          "type": "text-search",
        },
        "selection": {
          "filter": {
            "id": undefined,
            "props": {},
            "type": "object",
            "typename": "dxn:type:dxos.org/type/Person:0.1.0",
          },
          "type": "select",
        },
        "type": "filter",
      }
    `);
    });

    test('filter by ref', () => {
      const fred = Obj.make(Test.Person, { name: 'Fred' });
      const tasksByFred = Filter.type(Test.Task, { assignee: Ref.make(fred) });
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
      const orgsAndPeople = Query.select(Filter.or(Filter.type(Test.Organization), Filter.type(Test.Person)));

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
        Filter.not(Filter.or(Filter.type(Test.Organization), Filter.type(Test.Person))),
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
      const deletedTasks = Query.select(Filter.type(Test.Task)).options({
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

    test('filter by tags', () => {
      const query = Query.select(Filter.type(Test.Task)).select(Filter.tag('important'));
      Schema.validateSync(QueryAST.Query)(query.ast);
      expect(query.ast).toMatchInlineSnapshot(`
        {
          "filter": {
            "tag": "important",
            "type": "tag",
          },
          "selection": {
            "filter": {
              "id": undefined,
              "props": {},
              "type": "object",
              "typename": "dxn:type:dxos.org/type/Task:0.1.0",
            },
            "type": "select",
          },
          "type": "filter",
        }
      `);
    });

    test.skip('chain', () => {
      // NOTE: Can't support props without type since they can't be inferred.
      // const f1: Filter<Person> = Filter.props({ name: 'Fred' });

      // const x = Query.select(Filter.props({ id: '123' }));
      const y = Query.select(Filter.type(Test.Person));

      const or = Filter.or(Filter.type(Test.Person, { id: Filter.in('1', '2', '3') }), Filter.type(Test.Organization));

      const and = Filter.and(
        Filter.type(Test.Person, { id: Filter.in('1', '2', '3') }),
        Filter.type(Test.Person, { name: 'Fred' }),
      );

      const q = Query
        //
        // NOTE: Can't support functions since they can't be serialized (to server).
        // .filter((object) => Math.random() > 0.5)
        .select(Filter.type(Test.Person))
        .select(Filter.type(Test.Person, { name: 'Fred' }))
        .select({ age: Filter.between(20, 40) })
        .select(Filter.and(Filter.type(Test.Person), Filter.type(Test.Person, { name: Filter.in('bob', 'bill') })));

      log('stuff', { fOr: or, fAnd: and, q, y });
    });
  });

  describe('Filter', () => {
    test('Filter.or(Filter.typename(...))', () => {
      const filter = Filter.or(Filter.typename('dxos.org/type/Person'));
      // TODO(dmaretskyi): Give vitest type-tests a try.
      const _isAssignable: Obj.Any = null as any as Filter.Type<typeof filter>;
    });
  });
});
