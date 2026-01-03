//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { QueryAST } from '@dxos/echo-protocol';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';

import * as Filter from './Filter';
import * as Obj from './Obj';
import * as Order from './Order';
import * as Query from './Query';
import * as Ref from './Ref';
import { TestSchema } from './testing';

describe('query api', () => {
  describe('Query', () => {
    test('get all people', () => {
      const getAllPeople = Query.type(TestSchema.Person);

      log('query', { ast: getAllPeople.ast });
      Schema.validateSync(QueryAST.Query)(getAllPeople.ast);
      log('getAllPeople', { ast: getAllPeople.ast });
    });

    test('get all people ordered by name', () => {
      const getAllPeopleOrderedByName = Query.type(TestSchema.Person).orderBy(Order.property('name', 'asc'));

      log('query', { ast: getAllPeopleOrderedByName.ast });
      Schema.validateSync(QueryAST.Query)(getAllPeopleOrderedByName.ast);
      log('getAllPeopleOrderedByName', { ast: getAllPeopleOrderedByName.ast });
    });

    test('get all people named Fred', () => {
      const PeopleNamedFred = Query.select(Filter.type(TestSchema.Person, { name: 'Fred' }));

      log('query', { ast: PeopleNamedFred.ast });
      Schema.validateSync(QueryAST.Query)(PeopleNamedFred.ast);
      log('PeopleNamedFred', { ast: PeopleNamedFred.ast });
    });

    test('get all people with field of "label" set to "Research"', () => {
      const PeopleWithFieldLabelSetToResearch = Query.select(
        Filter.type(TestSchema.Person, { fields: Filter.contains({ label: 'label', value: 'Research' }) }),
      );

      log('query', { ast: PeopleWithFieldLabelSetToResearch.ast });
      Schema.validateSync(QueryAST.Query)(PeopleWithFieldLabelSetToResearch.ast);
      log('PeopleWithFieldLabelSetToResearch', { ast: PeopleWithFieldLabelSetToResearch.ast });
    });

    test('get all orgs with property "label" set to "Research"', () => {
      const OrgsWithPropertyLabelSetToResearch = Query.select(
        Filter.type(TestSchema.Organization, { properties: { label: 'Research' } }),
      );

      log('query', { ast: OrgsWithPropertyLabelSetToResearch.ast });
      Schema.validateSync(QueryAST.Query)(OrgsWithPropertyLabelSetToResearch.ast);
      log('OrgsWithPropertyLabelSetToResearch', { ast: OrgsWithPropertyLabelSetToResearch.ast });
    });

    test('get all orgs Fred worked for since 2020', () => {
      const fred = Obj.make(TestSchema.Person, { name: 'Fred' });
      const OrganizationsFredWorkedForSince2020 = Query.select(Filter.type(TestSchema.Person, { id: fred.id }))
        .sourceOf(TestSchema.EmployedBy, { since: Filter.gt('2020') })
        .target();

      log('query', { ast: OrganizationsFredWorkedForSince2020.ast });
      Schema.validateSync(QueryAST.Query)(OrganizationsFredWorkedForSince2020.ast);
      log('OrganizationsFredWorkedForSince2020', { ast: OrganizationsFredWorkedForSince2020.ast });
    });

    test('get all tasks for Fred', () => {
      const fred = Obj.make(TestSchema.Person, { name: 'Fred' });
      const TasksForFred = Query.select(Filter.type(TestSchema.Person, { id: fred.id })).referencedBy(
        TestSchema.Task,
        'assignee',
      );

      log('query', { ast: TasksForFred.ast });
      Schema.validateSync(QueryAST.Query)(TasksForFred.ast);
      log('TasksForFred', { ast: TasksForFred.ast });
    });

    test('get all tasks for employees of Cyberdyne', () => {
      const TasksForEmployeesOfCyberdyne = Query.select(Filter.type(TestSchema.Organization, { name: 'Cyberdyne' }))
        .targetOf(TestSchema.EmployedBy)
        .source()
        .referencedBy(TestSchema.Task, 'assignee');

      log('query', { ast: TasksForEmployeesOfCyberdyne.ast });
      Schema.validateSync(QueryAST.Query)(TasksForEmployeesOfCyberdyne.ast);
      log('TasksForEmployeesOfCyberdyne', { ast: TasksForEmployeesOfCyberdyne.ast });
    });

    test('get all people or orgs', () => {
      const PeopleOrOrganizations = Query.all(
        Query.select(Filter.type(TestSchema.Person)),
        Query.select(Filter.type(TestSchema.Organization)),
      );

      log('query', { ast: PeopleOrOrganizations.ast });
      Schema.validateSync(QueryAST.Query)(PeopleOrOrganizations.ast);
      log('PeopleOrOrganizations', { ast: PeopleOrOrganizations.ast });
    });

    test('get all people not in orgs', () => {
      const PeopleNotInOrganizations = Query.without(
        Query.select(Filter.type(TestSchema.Person)),
        Query.select(Filter.type(TestSchema.Person)).sourceOf(TestSchema.EmployedBy).source(),
      );

      log('query', { ast: PeopleNotInOrganizations.ast });
      Schema.validateSync(QueryAST.Query)(PeopleNotInOrganizations.ast);
      log('PeopleNotInOrganizations', { ast: PeopleNotInOrganizations.ast });
    });

    test('get assignees of all tasks created after 2020', () => {
      const AssigneesOfAllTasksCreatedAfter2020 = Query.select(
        Filter.type(TestSchema.Task, { deadline: Filter.gt('2020') }),
      ).reference('assignee');

      log('query', { ast: AssigneesOfAllTasksCreatedAfter2020.ast });
      Schema.validateSync(QueryAST.Query)(AssigneesOfAllTasksCreatedAfter2020.ast);
      log('AssigneesOfAllTasksCreatedAfter2020', { ast: AssigneesOfAllTasksCreatedAfter2020.ast });
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
      const contactFullTextSearch = Query.select(Filter.type(TestSchema.Person)).select(Filter.text('Bill'));

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
            "typename": "dxn:type:example.com/type/Person:0.1.0",
          },
          "type": "select",
        },
        "type": "filter",
      }
    `);
    });

    test('filter by ref', () => {
      const fred = Obj.make(TestSchema.Person, { name: 'Fred' });
      const tasksByFred = Filter.type(TestSchema.Task, { assignee: Ref.make(fred) });
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
        typename: 'dxn:type:example.com/type/Task:0.1.0',
      });
      log('tasksByFred', { ast: tasksByFred.ast });
    });

    test('select orgs and people', () => {
      const orgsAndPeople = Query.select(
        Filter.or(Filter.type(TestSchema.Organization), Filter.type(TestSchema.Person)),
      );

      Schema.validateSync(QueryAST.Query)(orgsAndPeople.ast);
      expect(orgsAndPeople.ast).toMatchInlineSnapshot(`
      {
        "filter": {
          "filters": [
            {
              "id": undefined,
              "props": {},
              "type": "object",
              "typename": "dxn:type:example.com/type/Organization:0.1.0",
            },
            {
              "id": undefined,
              "props": {},
              "type": "object",
              "typename": "dxn:type:example.com/type/Person:0.1.0",
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
        Filter.not(Filter.or(Filter.type(TestSchema.Organization), Filter.type(TestSchema.Person))),
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
                "typename": "dxn:type:example.com/type/Organization:0.1.0",
              },
              {
                "id": undefined,
                "props": {},
                "type": "object",
                "typename": "dxn:type:example.com/type/Person:0.1.0",
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
      const deletedTasks = Query.select(Filter.type(TestSchema.Task)).options({
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
            "typename": "dxn:type:example.com/type/Task:0.1.0",
          },
          "type": "select",
        },
        "type": "options",
      }
    `);
    });

    test('filter by tags', () => {
      const query = Query.select(Filter.type(TestSchema.Task)).select(Filter.tag('important'));
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
              "typename": "dxn:type:example.com/type/Task:0.1.0",
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
      const y = Query.select(Filter.type(TestSchema.Person));

      const or = Filter.or(
        Filter.type(TestSchema.Person, { id: Filter.in('1', '2', '3') }),
        Filter.type(TestSchema.Organization),
      );

      const and = Filter.and(
        Filter.type(TestSchema.Person, { id: Filter.in('1', '2', '3') }),
        Filter.type(TestSchema.Person, { name: 'Fred' }),
      );

      const q = Query
        //
        // NOTE: Can't support functions since they can't be serialized (to server).
        // .filter((object) => Math.random() > 0.5)
        .select(Filter.type(TestSchema.Person))
        .select(Filter.type(TestSchema.Person, { name: 'Fred' }))
        .select({ age: Filter.between(20, 40) })
        .select(
          Filter.and(
            Filter.type(TestSchema.Person),
            Filter.type(TestSchema.Person, { name: Filter.in('bob', 'bill') }),
          ),
        );

      log('stuff', { fOr: or, fAnd: and, q, y });
    });
  });

  describe('Filter', () => {
    test('Filter.or(Filter.typename(...))', () => {
      const filter = Filter.or(Filter.typename('example.com/type/Person'));
      // TODO(dmaretskyi): Give vitest type-tests a try.
      const _isAssignable: Obj.source = null as any as Filter.Type<typeof filter>;
    });
  });
});
