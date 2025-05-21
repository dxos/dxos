//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type QueryAST } from '@dxos/echo-protocol';
import { SpaceId } from '@dxos/keys';

import { EchoObject, EchoRelation, Filter, Query, Ref } from '@dxos/echo-schema';
import { Schema } from 'effect';
import { QueryPlanner } from './query-planner';

// Type name constants
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
  assignee: Ref(Person),
}).pipe(Type.def({ typename: 'dxos.org/type/Task', version: '0.1.0' }));
interface Task extends Schema.Schema.Type<typeof Task> {}

describe('QueryPlanner', () => {
  const planner = new QueryPlanner();

  test('get all people', () => {
    const query = Query.select(Filter.type(Person));

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "fromSpaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:dxos.org/type/Person:0.1.0",
              ],
            },
          },
          {
            "_tag": "FilterDeletedStep",
            "mode": "only-non-deleted",
          },
        ],
      }
    `);
  });

  test('get all people named Fred', () => {
    const query = Query.select(Filter.type(Person, { name: 'Fred' }));

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "fromSpaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:dxos.org/type/Person:0.1.0",
              ],
            },
          },
          {
            "_tag": "FilterDeletedStep",
            "mode": "only-non-deleted",
          },
          {
            "_tag": "FilterStep",
            "filter": {
              "id": undefined,
              "props": {
                "name": {
                  "operator": "eq",
                  "type": "compare",
                  "value": "Fred",
                },
              },
              "type": "object",
              "typename": null,
            },
          },
        ],
      }
    `);
  });

  test('get all orgs Fred worked for since 2020', () => {
    const query = Query.select(Filter.type(Person, { id: '01JVS9YYT5VMVJW0GGTM1YHCCH' }))
      .sourceOf(WorksFor, { since: Filter.gt('2020') })
      .target();

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "fromSpaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
            "selector": {
              "_tag": "IdSelector",
              "objectIds": [
                "01JVS9YYT5VMVJW0GGTM1YHCCH",
              ],
            },
          },
          {
            "_tag": "FilterDeletedStep",
            "mode": "only-non-deleted",
          },
          {
            "_tag": "FilterStep",
            "filter": {
              "id": undefined,
              "props": {},
              "type": "object",
              "typename": "dxn:type:dxos.org/type/Person:0.1.0",
            },
          },
          {
            "_tag": "TraverseStep",
            "traversal": {
              "_tag": "RelationTraversal",
              "direction": "source-to-relation",
            },
          },
          {
            "_tag": "FilterDeletedStep",
            "mode": "only-non-deleted",
          },
          {
            "_tag": "FilterStep",
            "filter": {
              "id": undefined,
              "props": {
                "since": {
                  "operator": "gt",
                  "type": "compare",
                  "value": "2020",
                },
              },
              "type": "object",
              "typename": "dxn:type:dxos.org/type/WorksFor:0.1.0",
            },
          },
          {
            "_tag": "TraverseStep",
            "traversal": {
              "_tag": "RelationTraversal",
              "direction": "relation-to-target",
            },
          },
          {
            "_tag": "FilterDeletedStep",
            "mode": "only-non-deleted",
          },
        ],
      }
    `);
  });

  test('get all tasks for Fred', () => {
    const query = Query.select(Filter.type(Person, { id: '01JVS9YYT7H6A6DXRN56RSHT6Z' })).referencedBy(
      Task,
      'assignee',
    );

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "fromSpaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
            "selector": {
              "_tag": "IdSelector",
              "objectIds": [
                "01JVS9YYT7H6A6DXRN56RSHT6Z",
              ],
            },
          },
          {
            "_tag": "FilterDeletedStep",
            "mode": "only-non-deleted",
          },
          {
            "_tag": "FilterStep",
            "filter": {
              "id": undefined,
              "props": {},
              "type": "object",
              "typename": "dxn:type:dxos.org/type/Person:0.1.0",
            },
          },
          {
            "_tag": "TraverseStep",
            "traversal": {
              "_tag": "ReferenceTraversal",
              "direction": "incoming",
              "property": "assignee",
            },
          },
          {
            "_tag": "FilterStep",
            "filter": {
              "props": {},
              "type": "object",
              "typename": "dxn:type:dxos.org/type/Task:0.1.0",
            },
          },
        ],
      }
    `);
  });

  test('get all tasks for employees of Cyberdyne', () => {
    const query = Query.select(Filter.type(Organization, { name: 'Cyberdyne' }))
      .targetOf(WorksFor)
      .source()
      .referencedBy(Task, 'assignee');

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "fromSpaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:dxos.org/type/Organization:0.1.0",
              ],
            },
          },
          {
            "_tag": "FilterDeletedStep",
            "mode": "only-non-deleted",
          },
          {
            "_tag": "FilterStep",
            "filter": {
              "id": undefined,
              "props": {
                "name": {
                  "operator": "eq",
                  "type": "compare",
                  "value": "Cyberdyne",
                },
              },
              "type": "object",
              "typename": null,
            },
          },
          {
            "_tag": "TraverseStep",
            "traversal": {
              "_tag": "RelationTraversal",
              "direction": "target-to-relation",
            },
          },
          {
            "_tag": "FilterDeletedStep",
            "mode": "only-non-deleted",
          },
          {
            "_tag": "FilterStep",
            "filter": {
              "id": undefined,
              "props": {},
              "type": "object",
              "typename": "dxn:type:dxos.org/type/WorksFor:0.1.0",
            },
          },
          {
            "_tag": "TraverseStep",
            "traversal": {
              "_tag": "RelationTraversal",
              "direction": "relation-to-source",
            },
          },
          {
            "_tag": "FilterDeletedStep",
            "mode": "only-non-deleted",
          },
          {
            "_tag": "TraverseStep",
            "traversal": {
              "_tag": "ReferenceTraversal",
              "direction": "incoming",
              "property": "assignee",
            },
          },
          {
            "_tag": "FilterStep",
            "filter": {
              "props": {},
              "type": "object",
              "typename": "dxn:type:dxos.org/type/Task:0.1.0",
            },
          },
        ],
      }
    `);
  });

  test('get all people or orgs', () => {
    const query = Query.all(Query.select(Filter.type(Person)), Query.select(Filter.type(Organization)));

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "UnionStep",
            "plans": [
              {
                "steps": [
                  {
                    "_tag": "SelectStep",
                    "fromSpaces": [
                      "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
                    ],
                    "selector": {
                      "_tag": "TypeSelector",
                      "inverted": false,
                      "typename": [
                        "dxn:type:dxos.org/type/Person:0.1.0",
                      ],
                    },
                  },
                  {
                    "_tag": "FilterDeletedStep",
                    "mode": "only-non-deleted",
                  },
                ],
              },
              {
                "steps": [
                  {
                    "_tag": "SelectStep",
                    "fromSpaces": [
                      "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
                    ],
                    "selector": {
                      "_tag": "TypeSelector",
                      "inverted": false,
                      "typename": [
                        "dxn:type:dxos.org/type/Organization:0.1.0",
                      ],
                    },
                  },
                  {
                    "_tag": "FilterDeletedStep",
                    "mode": "only-non-deleted",
                  },
                ],
              },
            ],
          },
        ],
      }
    `);
  });

  test('get assignees of all tasks created after 2020', () => {
    const query = Query.select(Filter.type(Task, { createdAt: Filter.gt('2020') })).reference('assignee');

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "fromSpaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:dxos.org/type/Task:0.1.0",
              ],
            },
          },
          {
            "_tag": "FilterDeletedStep",
            "mode": "only-non-deleted",
          },
          {
            "_tag": "FilterStep",
            "filter": {
              "id": undefined,
              "props": {
                "createdAt": {
                  "operator": "gt",
                  "type": "compare",
                  "value": "2020",
                },
              },
              "type": "object",
              "typename": null,
            },
          },
          {
            "_tag": "TraverseStep",
            "traversal": {
              "_tag": "ReferenceTraversal",
              "direction": "outgoing",
              "property": "assignee",
            },
          },
        ],
      }
    `);
  });

  test('contact full-text search', () => {
    const query = Query.select(Filter.text(Person, 'Bill'));

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "fromSpaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
            "selector": {
              "_tag": "TextSearchSelector",
              "searchKind": "full-text",
              "text": "Bill",
            },
          },
          {
            "_tag": "FilterDeletedStep",
            "mode": "only-non-deleted",
          },
          {
            "_tag": "FilterStep",
            "filter": {
              "props": {},
              "type": "object",
              "typename": "dxn:type:dxos.org/type/Person:0.1.0",
            },
          },
        ],
      }
    `);
  });

  test('select multiple types', () => {
    const query = Query.select(Filter.or(Filter.type(Organization), Filter.type(Person)));

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "fromSpaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:dxos.org/type/Organization:0.1.0",
                "dxn:type:dxos.org/type/Person:0.1.0",
              ],
            },
          },
          {
            "_tag": "FilterDeletedStep",
            "mode": "only-non-deleted",
          },
        ],
      }
    `);
  });

  test('select excluding multiple types', () => {
    const query = Query.select(Filter.not(Filter.or(Filter.type(Organization), Filter.type(Person))));

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "fromSpaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": true,
              "typename": [
                "dxn:type:dxos.org/type/Organization:0.1.0",
                "dxn:type:dxos.org/type/Person:0.1.0",
              ],
            },
          },
          {
            "_tag": "FilterDeletedStep",
            "mode": "only-non-deleted",
          },
        ],
      }
    `);
  });

  test('select deleted tasks', () => {
    const query = Query.select(Filter.type(Task)).options({ deleted: 'only' });

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "fromSpaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:dxos.org/type/Task:0.1.0",
              ],
            },
          },
          {
            "_tag": "FilterDeletedStep",
            "mode": "only-deleted",
          },
        ],
      }
    `);
  });
});

const SPACE_ID = SpaceId.make('B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO'); // Stable id for inline snapshots.

const withSpaceIdOptions = (query: QueryAST.Query): QueryAST.Query => ({
  type: 'options',
  query,
  options: {
    spaceIds: [SPACE_ID],
  },
});
