//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, expectTypeOf, test } from 'vitest';

import { QueryAST } from '@dxos/echo-protocol';
import { DXN, EID, EntityId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import * as Aggregate from './Aggregate';
import * as Dataset from './Dataset';
import * as Feed from './Feed';
import * as Filter from './Filter';
import * as Obj from './Obj';
import * as Order from './Order';
import * as Query from './Query';
import * as Ref from './Ref';
import { TestSchema } from './testing';
import * as Type from './Type';

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

    test('order by updated timestamp', () => {
      const recentlyUpdated = Query.type(TestSchema.Person).orderBy(Order.updated('desc')).limit(3);

      Schema.validateSync(QueryAST.Query)(recentlyUpdated.ast);
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

    test('get all objects referencing Fred (any type, specified property)', () => {
      const fred = Obj.make(TestSchema.Person, { name: 'Fred' });
      const ObjectsReferencingFred = Query.select(Filter.type(TestSchema.Person, { id: fred.id })).referencedBy(
        TestSchema.Task,
      );

      log('query', { ast: ObjectsReferencingFred.ast });
      Schema.validateSync(QueryAST.Query)(ObjectsReferencingFred.ast);
      expect(ObjectsReferencingFred.ast).toMatchObject({
        type: 'incoming-references',
        property: null,
        typename: 'dxn:com.example.type.task:0.1.0',
      });
    });

    test('get all objects referencing Fred (any type, any property)', () => {
      const fred = Obj.make(TestSchema.Person, { name: 'Fred' });
      const AllBacklinks = Query.select(Filter.type(TestSchema.Person, { id: fred.id })).referencedBy();

      log('query', { ast: AllBacklinks.ast });
      Schema.validateSync(QueryAST.Query)(AllBacklinks.ast);
      expect(AllBacklinks.ast).toMatchObject({
        type: 'incoming-references',
        property: null,
        typename: null,
      });
    });

    test('reference through array of refs is typed', () => {
      const objects = Query.select(Filter.type(TestSchema.Container)).reference('objects');
      expectTypeOf<Query.Type<typeof objects>>().toEqualTypeOf<Obj.Unknown>();
    });

    test('reference through single ref is typed', () => {
      const assignee = Query.select(Filter.type(TestSchema.Task)).reference('assignee');
      expectTypeOf<Query.Type<typeof assignee>>().toEqualTypeOf<Type.InstanceType<typeof TestSchema.Person>>();
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

    test('Filter.query(Dataset.Dataset) (union of schemas)', () => {
      const AllDatasets = Query.select(Filter.type(Dataset.Dataset));

      log('query', { ast: AllDatasets.ast });
      Schema.validateSync(QueryAST.Query)(AllDatasets.ast);
      log('AllDatasets', { ast: AllDatasets.ast });
      expect(AllDatasets.ast).toMatchInlineSnapshot(`
        {
          "filter": {
            "filters": [
              {
                "props": {},
                "type": "object",
                "typename": "dxn:org.dxos.type.feed:0.1.0",
              },
              {
                "props": {},
                "type": "object",
                "typename": "dxn:org.dxos.type.collection:0.1.0",
              },
              {
                "props": {},
                "type": "object",
                "typename": "dxn:org.dxos.type.view:0.1.0",
              },
            ],
            "type": "or",
          },
          "type": "select",
        }
      `);
    });

    test('Query.type(Dataset.Dataset) (union of schemas)', () => {
      const AllDatasets = Query.type(Dataset.Dataset);

      log('query', { ast: AllDatasets.ast });
      Schema.validateSync(QueryAST.Query)(AllDatasets.ast);
      log('AllDatasets', { ast: AllDatasets.ast });
      expect(AllDatasets.ast).toMatchInlineSnapshot(`
              {
                "filter": {
                  "filters": [
                    {
                      "props": {},
                      "type": "object",
                      "typename": "dxn:org.dxos.type.feed:0.1.0",
                    },
                    {
                      "props": {},
                      "type": "object",
                      "typename": "dxn:org.dxos.type.collection:0.1.0",
                    },
                    {
                      "props": {},
                      "type": "object",
                      "typename": "dxn:org.dxos.type.view:0.1.0",
                    },
                  ],
                  "type": "or",
                },
                "type": "select",
              }
            `);
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
              "typename": "dxn:com.example.type.person:0.1.0",
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
              '/': EID.make({ entityId: fred.id }),
            },
          },
        },
        type: 'object',
        typename: 'dxn:com.example.type.task:0.1.0',
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
                "typename": "dxn:com.example.type.organization:0.1.0",
              },
              {
                "id": undefined,
                "props": {},
                "type": "object",
                "typename": "dxn:com.example.type.person:0.1.0",
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
                  "typename": "dxn:com.example.type.organization:0.1.0",
                },
                {
                  "id": undefined,
                  "props": {},
                  "type": "object",
                  "typename": "dxn:com.example.type.person:0.1.0",
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
              "typename": "dxn:com.example.type.task:0.1.0",
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
              "typename": "dxn:com.example.type.task:0.1.0",
            },
            "type": "select",
          },
          "type": "filter",
        }
      `);
    });

    test('limit results', () => {
      const query = Query.select(Filter.type(TestSchema.Task)).limit(10);
      Schema.validateSync(QueryAST.Query)(query.ast);
      expect(query.ast).toMatchInlineSnapshot(`
        {
          "limit": 10,
          "query": {
            "filter": {
              "id": undefined,
              "props": {},
              "type": "object",
              "typename": "dxn:com.example.type.task:0.1.0",
            },
            "type": "select",
          },
          "type": "limit",
        }
      `);
    });

    test('ordered and limited results', () => {
      const query = Query.select(Filter.type(TestSchema.Task)).orderBy(Order.property('title', 'asc')).limit(10);
      Schema.validateSync(QueryAST.Query)(query.ast);
      expect(query.ast).toMatchInlineSnapshot(`
        {
          "limit": 10,
          "query": {
            "order": [
              {
                "direction": "asc",
                "kind": "property",
                "property": "title",
              },
            ],
            "query": {
              "filter": {
                "id": undefined,
                "props": {},
                "type": "object",
                "typename": "dxn:com.example.type.task:0.1.0",
              },
              "type": "select",
            },
            "type": "order",
          },
          "type": "limit",
        }
      `);
    });

    test('union of limited queries', () => {
      const query = Query.all(
        Query.select(Filter.type(TestSchema.Person)).limit(5),
        Query.select(Filter.type(TestSchema.Organization)).limit(5),
      );
      Schema.validateSync(QueryAST.Query)(query.ast);
      expect(query.ast).toMatchInlineSnapshot(`
        {
          "queries": [
            {
              "limit": 5,
              "query": {
                "filter": {
                  "id": undefined,
                  "props": {},
                  "type": "object",
                  "typename": "dxn:com.example.type.person:0.1.0",
                },
                "type": "select",
              },
              "type": "limit",
            },
            {
              "limit": 5,
              "query": {
                "filter": {
                  "id": undefined,
                  "props": {},
                  "type": "object",
                  "typename": "dxn:com.example.type.organization:0.1.0",
                },
                "type": "select",
              },
              "type": "limit",
            },
          ],
          "type": "union",
        }
      `);
    });

    test('from all accessible spaces', () => {
      const query = Query.select(Filter.type(TestSchema.Person)).from('all-accessible-spaces');

      Schema.validateSync(QueryAST.Query)(query.ast);
      expect(query.ast).toMatchInlineSnapshot(`
        {
          "from": {
            "_tag": "scope",
            "scopes": [],
          },
          "query": {
            "filter": {
              "id": undefined,
              "props": {},
              "type": "object",
              "typename": "dxn:com.example.type.person:0.1.0",
            },
            "type": "select",
          },
          "type": "from",
        }
      `);
    });

    test('from all accessible spaces with feeds', () => {
      const query = Query.select(Filter.type(TestSchema.Person)).from('all-accessible-spaces', {
        includeFeeds: true,
      });

      Schema.validateSync(QueryAST.Query)(query.ast);
      expect(query.ast).toMatchInlineSnapshot(`
        {
          "from": {
            "_tag": "scope",
            "scopes": [],
          },
          "query": {
            "filter": {
              "id": undefined,
              "props": {},
              "type": "object",
              "typename": "dxn:com.example.type.person:0.1.0",
            },
            "type": "select",
          },
          "type": "from",
        }
      `);
    });

    test('from all accessible spaces with ordering and limit', () => {
      const query = Query.select(Filter.type(TestSchema.Person))
        .orderBy(Order.property('name', 'asc'))
        .limit(10)
        .from('all-accessible-spaces');

      Schema.validateSync(QueryAST.Query)(query.ast);
      expect(query.ast).toMatchObject({
        type: 'from',
        from: { _tag: 'scope', scopes: [] },
        query: {
          type: 'limit',
          limit: 10,
          query: {
            type: 'order',
          },
        },
      });
    });

    test('Query.type(...).from(feed) sets queue scope', async () => {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const feedDxn = EID.make({ spaceId: spaceId, entityId: feedId });
      const feed = (await Obj.fromJSON(
        {
          '@type': 'dxn:org.dxos.type.feed:0.1.0',
          'id': feedId,
          'name': 'test-feed',
        },
        { uri: feedDxn },
      )) as Feed.Feed;

      const expectedFeedUri = Feed.getFeedUri(feed);

      const query = Query.type(TestSchema.Person).from(feed);
      Schema.validateSync(QueryAST.Query)(query.ast);
      expect(query.ast).toMatchObject({
        type: 'from',
        from: {
          _tag: 'scope',
          scopes: [{ _tag: 'feed', feedUri: expectedFeedUri?.toString() }],
        },
        query: {
          type: 'select',
          filter: {
            type: 'object',
            typename: 'dxn:com.example.type.person:0.1.0',
          },
        },
      });
    });

    test('Query.from(non-feed) throws TypeError', () => {
      const person = Obj.make(TestSchema.Person, { name: 'Fred' });
      expect(() => Query.select(Filter.type(TestSchema.Person)).from(person as any)).toThrow(TypeError);
      expect(() => Query.select(Filter.type(TestSchema.Person)).from(person as any)).toThrow(
        /Query\.from\(\) expects Feed objects/,
      );
    });

    test('Query.from(undefined) throws TypeError', () => {
      expect(() => Query.select(Filter.type(TestSchema.Person)).from(undefined as any)).toThrow(TypeError);
      expect(() => Query.select(Filter.type(TestSchema.Person)).from(undefined as any)).toThrow(
        /Query\.from\(\) requires a valid data source argument/,
      );
    });

    test('Query.from(null) throws TypeError', () => {
      expect(() => Query.select(Filter.type(TestSchema.Person)).from(null as any)).toThrow(TypeError);
      expect(() => Query.select(Filter.type(TestSchema.Person)).from(null as any)).toThrow(
        /Query\.from\(\) requires a valid data source argument/,
      );
    });

    test('Query.pretty surfaces debugLabel from options', () => {
      const query = Query.select(Filter.type(TestSchema.Person)).debugLabel('my-label');
      expect(Query.pretty(query)).toContain('debugLabel');
      expect(Query.pretty(query)).toContain('"my-label"');
    });

    test('Query.debugLabel merges onto existing options clause', () => {
      const query = Query.select(Filter.type(TestSchema.Person))
        .options({ deleted: 'exclude' })
        .debugLabel('timer-probe');
      const pretty = Query.pretty(query);
      expect(pretty).toContain('deleted');
      expect(pretty).toContain('debugLabel');
      expect(pretty).toContain('"timer-probe"');
    });

    test('Query.pretty returns human-readable query string', () => {
      const query = Query.select(Filter.type(TestSchema.Person, { name: 'Fred' }));
      const pretty = Query.pretty(query);
      expect(pretty).toContain('Query.select');
      expect(pretty).toContain('Filter.type');
      expect(pretty).toContain('com.example.type.person');
    });

    test('Query.pretty handles complex queries', () => {
      const query = Query.select(Filter.and(Filter.type(TestSchema.Person), Filter.id(EntityId.random()))).limit(10);
      const pretty = Query.pretty(query);
      expect(pretty).toContain('Query.select');
      expect(pretty).toContain('Filter.and');
      expect(pretty).toContain('limit(10)');
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

  describe('Filter.in (subquery projection)', () => {
    test('Query.project builds a Projection carrying the query ast and property', () => {
      const subquery = Query.select(Filter.type(TestSchema.Task, { completed: true }));
      const projection = subquery.project('title');

      expect(projection.property).toBe('title');
      expect(projection.query).toEqual(subquery.ast);
    });

    test('standalone Query.project is equivalent to the instance method', () => {
      const subquery = Query.select(Filter.type(TestSchema.Task, { completed: true }));
      expect(Query.project(subquery, 'title')).toEqual(subquery.project('title'));
    });

    test('Filter.in(projection) builds an in-query AST node', () => {
      const subquery = Query.select(Filter.type(TestSchema.Task, { completed: true }));
      const filter = Filter.in(subquery.project('title'));

      expect(filter.ast).toMatchObject({
        type: 'in-query',
        subquery: subquery.ast,
        property: 'title',
      });
      Schema.validateSync(QueryAST.Filter)(filter.ast);
    });

    test('Filter.in(...) with literal values still builds a plain in node', () => {
      const filter = Filter.in('1', '2', '3');
      expect(filter.ast).toEqual({ type: 'in', values: ['1', '2', '3'] });
      Schema.validateSync(QueryAST.Filter)(filter.ast);
    });

    test('nested Filter.in(projection) composes inside Filter.type', () => {
      const subquery = Query.select(Filter.type(TestSchema.Task, { completed: true }));
      const query = Query.select(Filter.type(TestSchema.Task, { title: Filter.in(subquery.project('title')) }));

      Schema.validateSync(QueryAST.Query)(query.ast);
      expect(query.ast).toMatchObject({
        type: 'select',
        filter: {
          type: 'object',
          props: {
            title: {
              type: 'in-query',
              property: 'title',
              subquery: subquery.ast,
            },
          },
        },
      });
    });

    test('Query.pretty renders the subquery form', () => {
      const subquery = Query.select(Filter.type(TestSchema.Task, { completed: true }));
      const query = Query.select(Filter.type(TestSchema.Task, { title: Filter.in(subquery.project('title')) }));
      const pretty = Query.pretty(query);

      expect(pretty).toContain('Filter.in(');
      expect(pretty).toContain('.project("title")');
      expect(pretty).toContain('Query.select(Filter.type(');
    });

    test('project is strictly typed to the query type properties', () => {
      const subquery = Query.select(Filter.type(TestSchema.Task, { completed: true }));

      // `title` is `Schema.optional(Schema.String)` on Task — the projection and the filter it
      // feeds both carry that exact value type, not `unknown`, through Query.project -> Filter.in.
      expectTypeOf(subquery.project('title')).toEqualTypeOf<Query.Projection<string | undefined>>();
      expectTypeOf(Query.project(subquery, 'title')).toEqualTypeOf<Query.Projection<string | undefined>>();
      expectTypeOf(Filter.in(subquery.project('title'))).toEqualTypeOf<Filter.Filter<string | undefined>>();

      // @ts-expect-error - 'nope' is not a property of Task.
      subquery.project('nope');
    });
  });

  describe('Filter.childOf', () => {
    test('childOf with Ref', () => {
      const parentDxn = EID.make({ spaceId: SpaceId.random(), entityId: EntityId.random() });
      const parentRef = Ref.fromURI(parentDxn);
      const filter = Filter.childOf(parentRef);

      expect(filter.ast).toMatchObject({
        type: 'child-of',
        parents: [parentDxn],
        transitive: true,
      });
      Schema.validateSync(QueryAST.Filter)(filter.ast);
    });

    test('childOf with object', () => {
      const parent = Obj.make(TestSchema.Person, { name: 'Parent' });
      const filter = Filter.childOf(parent);

      expect(filter.ast).toMatchObject({
        type: 'child-of',
        transitive: true,
      });
      expect(filter.ast.type === 'child-of' && filter.ast.parents.length).toBe(1);
      Schema.validateSync(QueryAST.Filter)(filter.ast);
    });

    test('childOf with array of Refs', () => {
      const dxn1 = EID.make({ spaceId: SpaceId.random(), entityId: EntityId.random() });
      const dxn2 = EID.make({ spaceId: SpaceId.random(), entityId: EntityId.random() });
      const filter = Filter.childOf([Ref.fromURI(dxn1), Ref.fromURI(dxn2)]);

      expect(filter.ast).toMatchObject({
        type: 'child-of',
        parents: [dxn1, dxn2],
        transitive: true,
      });
      Schema.validateSync(QueryAST.Filter)(filter.ast);
    });

    test('childOf with transitive=false', () => {
      const parentRef = Ref.fromURI(EID.make({ spaceId: SpaceId.random(), entityId: EntityId.random() }));
      const filter = Filter.childOf(parentRef, { transitive: false });

      expect(filter.ast).toMatchObject({
        type: 'child-of',
        parents: [parentRef.uri],
        transitive: false,
      });
      Schema.validateSync(QueryAST.Filter)(filter.ast);
    });

    test('childOf in select query', () => {
      const parentDxn = EID.make({ spaceId: SpaceId.random(), entityId: EntityId.random() });
      const parentRef = Ref.fromURI(parentDxn);
      const query = Query.select(Filter.childOf(parentRef));

      expect(query.ast).toMatchObject({
        type: 'select',
        filter: {
          type: 'child-of',
          parents: [parentDxn],
          transitive: true,
        },
      });
      Schema.validateSync(QueryAST.Query)(query.ast);
    });

    test('childOf combined with type filter', () => {
      const parentDxn = EID.make({ spaceId: SpaceId.random(), entityId: EntityId.random() });
      const parentRef = Ref.fromURI(parentDxn);
      const query = Query.select(Filter.and(Filter.type(TestSchema.Person), Filter.childOf(parentRef)));

      Schema.validateSync(QueryAST.Query)(query.ast);
      expect(query.ast).toMatchObject({
        type: 'select',
        filter: {
          type: 'and',
          filters: [
            { type: 'object', typename: 'dxn:com.example.type.person:0.1.0' },
            { type: 'child-of', parents: [parentDxn], transitive: true },
          ],
        },
      });
    });

    test('childOf pretty-prints correctly', () => {
      const parentRef = Ref.fromURI(EID.make({ spaceId: SpaceId.random(), entityId: EntityId.random() }));
      const filter = Filter.childOf(parentRef);
      const pretty = Filter.pretty(filter);
      expect(pretty).toContain('Filter.childOf');
      expect(pretty).toContain('transitive: true');
    });

    test('childOf with mixed objects and Refs', () => {
      const parent = Obj.make(TestSchema.Person, { name: 'Parent' });
      const refDxn = EID.make({ spaceId: SpaceId.random(), entityId: EntityId.random() });
      const parentRef = Ref.fromURI(refDxn);
      const filter = Filter.childOf([parent, parentRef]);

      expect(filter.ast).toMatchObject({
        type: 'child-of',
        transitive: true,
      });
      expect(filter.ast.type === 'child-of' && filter.ast.parents.length).toBe(2);
      Schema.validateSync(QueryAST.Filter)(filter.ast);
    });

    describe('.aggregate', () => {
      test('group by a single property', () => {
        const query = Query.select(Filter.type(TestSchema.Person)).aggregate({
          email: Aggregate.group('email'),
        });

        expect(query.ast).toMatchObject({
          type: 'aggregate',
          aggregates: [{ name: 'email', kind: 'group', property: 'email' }],
        });
        Schema.validateSync(QueryAST.Query)(query.ast);
      });

      test('group by multiple properties forms a composite key', () => {
        const query = Query.select(Filter.type(TestSchema.Person)).aggregate({
          name: Aggregate.group('name'),
          email: Aggregate.group('email'),
        });

        expect(query.ast).toMatchObject({
          type: 'aggregate',
          aggregates: [
            { name: 'name', kind: 'group', property: 'name' },
            { name: 'email', kind: 'group', property: 'email' },
          ],
        });
        Schema.validateSync(QueryAST.Query)(query.ast);
      });

      test('aggregate-everything (no group entries) is valid', () => {
        const query = Query.select(Filter.type(TestSchema.Person)).aggregate({ latest: Aggregate.max('name') });

        expect(query.ast).toMatchObject({
          type: 'aggregate',
          aggregates: [{ name: 'latest', kind: 'max', property: 'name' }],
        });
        Schema.validateSync(QueryAST.Query)(query.ast);
      });

      test("aggregate wraps the preceding query as the aggregate node's inner query", () => {
        const inner = Query.select(Filter.type(TestSchema.Person));
        const query = inner.aggregate({ email: Aggregate.group('email') });

        expect(query.ast).toMatchObject({ type: 'aggregate', query: inner.ast });
      });

      test('from()/options() may follow aggregate, keeping it the outermost data clause', () => {
        const grouped = Query.select(Filter.type(TestSchema.Person)).aggregate({ email: Aggregate.group('email') });

        const withOptions = grouped.options({ debugLabel: 'grouped' });
        expect(withOptions.ast).toMatchObject({ type: 'options', query: grouped.ast });
        Schema.validateSync(QueryAST.Query)(withOptions.ast);

        const withDebugLabel = grouped.debugLabel('grouped-2');
        expect(withDebugLabel.ast).toMatchObject({ type: 'options', options: { debugLabel: 'grouped-2' } });
        Schema.validateSync(QueryAST.Query)(withDebugLabel.ast);
      });

      test('items carries its limit', () => {
        const query = Query.select(Filter.type(TestSchema.Person)).aggregate({
          email: Aggregate.group('email'),
          items: Aggregate.items({ limit: 20 }),
        });

        expect(query.ast).toMatchObject({
          type: 'aggregate',
          aggregates: [
            { name: 'email', kind: 'group', property: 'email' },
            { name: 'items', kind: 'items', limit: 20 },
          ],
        });
        Schema.validateSync(QueryAST.Query)(query.ast);
      });

      test('aggregate declares named aggregates on the aggregate node', () => {
        const query = Query.select(Filter.type(TestSchema.Person)).aggregate({
          email: Aggregate.group('email'),
          latest: Aggregate.max('name'),
          earliest: Aggregate.min('name'),
          total: Aggregate.count(),
          items: Aggregate.items(),
        });

        expect(query.ast).toMatchObject({
          type: 'aggregate',
          aggregates: [
            { name: 'email', kind: 'group', property: 'email' },
            { name: 'latest', kind: 'max', property: 'name' },
            { name: 'earliest', kind: 'min', property: 'name' },
            { name: 'total', kind: 'count' },
            { name: 'items', kind: 'items' },
          ],
        });
        Schema.validateSync(QueryAST.Query)(query.ast);
      });

      test('orderBy(Order.property) after aggregate orders by the aggregate field', () => {
        const grouped = Query.select(Filter.type(TestSchema.Person)).aggregate({
          email: Aggregate.group('email'),
          latest: Aggregate.max('name'),
        });
        const ordered = grouped.orderBy(Order.property('latest', 'desc'));

        expect(ordered.ast).toMatchObject({
          type: 'order',
          query: grouped.ast,
          order: [{ kind: 'property', property: 'latest', direction: 'desc' }],
        });
        Schema.validateSync(QueryAST.Query)(ordered.ast);
      });

      test('Query.pretty renders aggregates (incl. group + items limit) and aggregate ordering', () => {
        const query = Query.select(Filter.type(TestSchema.Person))
          .aggregate({
            email: Aggregate.group('email'),
            latest: Aggregate.max('name'),
            items: Aggregate.items({ limit: 20 }),
          })
          .orderBy(Order.property('latest', 'desc'));
        const pretty = Query.pretty(query);
        expect(pretty).toContain(
          '.aggregate({ "email": Aggregate.group("email"), "latest": Aggregate.max("name"), "items": Aggregate.items({ limit: 20 }) })',
        );
        expect(pretty).toContain('.orderBy(Order.property("latest", "desc"))');
      });

      test('type-level: aggregates surface as flat top-level fields', () => {
        const query = Query.type(TestSchema.Person).aggregate({
          email: Aggregate.group('email'),
          latest: Aggregate.max('name'),
          total: Aggregate.count(),
          items: Aggregate.items(),
        });
        expectTypeOf<Query.Type<typeof query>>().toHaveProperty('email');
        expectTypeOf<Query.Type<typeof query>>().toHaveProperty('latest');
        expectTypeOf<Query.Type<typeof query>>().toHaveProperty('total');
        expectTypeOf<Query.Type<typeof query>>().toHaveProperty('items');
        // The flat record has no nested `key` wrapper.
        expectTypeOf<Query.Type<typeof query>>().not.toHaveProperty('key');
      });

      test('type-level: Aggregate.group/max/min property is checked against the element type', () => {
        const query = Query.type(TestSchema.Person);
        // Valid element properties compile.
        query.aggregate({
          email: Aggregate.group('email'),
          latest: Aggregate.max('name'),
          oldest: Aggregate.min('age'),
        });
        // @ts-expect-error - 'nope' is not a property of Person.
        query.aggregate({ bad: Aggregate.group('nope') });
        // @ts-expect-error - 'nope' is not a property of Person.
        query.aggregate({ bad: Aggregate.max('nope') });
        // @ts-expect-error - min is checked too.
        query.aggregate({ bad: Aggregate.min('nope') });
      });

      test('type-level: aggregate value type tracks its kind and element property type', () => {
        const query = Query.type(TestSchema.Person).aggregate({
          email: Aggregate.group('email'),
          latest: Aggregate.max('name'),
          oldest: Aggregate.min('age'),
          total: Aggregate.count(),
          items: Aggregate.items(),
        });
        type Group = Query.Type<typeof query>;
        // `email`/`name`/`age` are optional on Person (partial schema); group/max/min are additionally
        // nullable (missing/non-scalar members bucket under null) — so the value tracks the property type.
        expectTypeOf<Group['email']>().toEqualTypeOf<string | undefined | null>();
        expectTypeOf<Group['latest']>().toEqualTypeOf<string | undefined | null>();
        expectTypeOf<Group['oldest']>().toEqualTypeOf<number | undefined | null>();
        expectTypeOf<Group['total']>().toEqualTypeOf<number>();
        // `items` is an array of the element type.
        expectTypeOf<Group['items']>().toBeArray();
        expectTypeOf<Group['items'][number]>().toHaveProperty('name');

        // Assignment-level proof that it is a real string/number union and not `any`.
        // @ts-expect-error - a string aggregate does not accept a number.
        const badName: Group['latest'] = 42;
        // @ts-expect-error - a number aggregate does not accept a string.
        const badAge: Group['oldest'] = 'nope';
        void badName;
        void badAge;
      });

      test('type-level: Order.property after aggregate is checked against the flat record fields', () => {
        const grouped = Query.type(TestSchema.Person).aggregate({
          email: Aggregate.group('email'),
          latest: Aggregate.max('name'),
          total: Aggregate.count(),
        });
        // Declared group/aggregate fields compile.
        grouped.orderBy(Order.property('email', 'asc'));
        grouped.orderBy(Order.property('latest', 'desc'));
        grouped.orderBy(Order.property('total', 'asc'));
        // @ts-expect-error - 'earliest' was never declared as an aggregate.
        grouped.orderBy(Order.property('earliest', 'desc'));
        // @ts-expect-error - 'name' is an element property, not a result field, so it is not orderable here.
        grouped.orderBy(Order.property('name', 'desc'));
      });

      test('type-level: Order.property follows the current result shape across aggregate', () => {
        const ungrouped = Query.type(TestSchema.Person);
        // Before aggregate: element properties are orderable.
        ungrouped.orderBy(Order.property('name', 'desc'));
        // @ts-expect-error - 'latest' is not an element property before aggregating.
        ungrouped.orderBy(Order.property('latest', 'desc'));

        const grouped = Query.type(TestSchema.Person).aggregate({
          email: Aggregate.group('email'),
          latest: Aggregate.max('name'),
        });
        // After aggregate: the result fields are orderable, element properties are not.
        grouped.orderBy(Order.property('latest', 'desc'));
        // @ts-expect-error - 'name' is an element property, not a result field.
        grouped.orderBy(Order.property('name', 'desc'));
      });
    });
  });

  describe('Filter', () => {
    test('Filter.or(Filter.type(...))', () => {
      const filter = Filter.or(Filter.type(DXN.make('com.example.type.person')));
      // TODO(dmaretskyi): Give vitest type-tests a try.
      const _isAssignable: Obj.Unknown = null as any as Filter.Type<typeof filter>;
    });

    test('Filter.pretty returns human-readable filter string', () => {
      const filter = Filter.type(TestSchema.Person, { name: 'Fred' });
      const pretty = Filter.pretty(filter);
      expect(pretty).toContain('Filter.type');
      expect(pretty).toContain('com.example.type.person');
    });

    test('Filter.pretty handles complex filters', () => {
      const filter = Filter.and(Filter.type(TestSchema.Person), Filter.id(EntityId.random()));
      const pretty = Filter.pretty(filter);
      expect(pretty).toContain('Filter.and');
      expect(pretty).toContain('Filter.type');
    });

    test('Filter.pretty handles or filters', () => {
      const filter = Filter.or(Filter.type(TestSchema.Person), Filter.type(TestSchema.Organization));
      const pretty = Filter.pretty(filter);
      expect(pretty).toContain('Filter.or');
    });
  });
});
