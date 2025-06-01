//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type QueryAST } from '@dxos/echo-protocol';
import { Filter, Query } from '@dxos/echo-schema';
import { SpaceId } from '@dxos/keys';

import { QueryPlanner } from './query-planner';
import { TestSchema } from '../testing';

describe('QueryPlanner', () => {
  const planner = new QueryPlanner();

  test('get all people', () => {
    const query = Query.select(Filter.type(TestSchema.Person));

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:dxos.org/type/Person:0.1.0",
              ],
            },
            "spaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
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
    const query = Query.select(Filter.type(TestSchema.Person, { name: 'Fred' }));

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:dxos.org/type/Person:0.1.0",
              ],
            },
            "spaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
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
    const query = Query.select(Filter.type(TestSchema.Person, { id: '01JVS9YYT5VMVJW0GGTM1YHCCH' }))
      .sourceOf(TestSchema.WorksFor, { since: Filter.gt('2020') })
      .target();

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "selector": {
              "_tag": "IdSelector",
              "objectIds": [
                "01JVS9YYT5VMVJW0GGTM1YHCCH",
              ],
            },
            "spaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
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
    const query = Query.select(Filter.type(TestSchema.Person, { id: '01JVS9YYT7H6A6DXRN56RSHT6Z' })).referencedBy(
      TestSchema.Task,
      'assignee',
    );

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "selector": {
              "_tag": "IdSelector",
              "objectIds": [
                "01JVS9YYT7H6A6DXRN56RSHT6Z",
              ],
            },
            "spaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
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
            "_tag": "FilterDeletedStep",
            "mode": "only-non-deleted",
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
    const query = Query.select(Filter.type(TestSchema.Organization, { name: 'Cyberdyne' }))
      .targetOf(TestSchema.WorksFor)
      .source()
      .referencedBy(TestSchema.Task, 'assignee');

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:dxos.org/type/Organization:0.1.0",
              ],
            },
            "spaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
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
            "_tag": "FilterDeletedStep",
            "mode": "only-non-deleted",
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
    const query = Query.all(
      Query.select(Filter.type(TestSchema.Person)),
      Query.select(Filter.type(TestSchema.Organization)),
    );

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
                    "selector": {
                      "_tag": "TypeSelector",
                      "inverted": false,
                      "typename": [
                        "dxn:type:dxos.org/type/Person:0.1.0",
                      ],
                    },
                    "spaces": [
                      "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
                    ],
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
                    "selector": {
                      "_tag": "TypeSelector",
                      "inverted": false,
                      "typename": [
                        "dxn:type:dxos.org/type/Organization:0.1.0",
                      ],
                    },
                    "spaces": [
                      "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
                    ],
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
    const query = Query.select(Filter.type(TestSchema.Task, { createdAt: Filter.gt('2020') })).reference('assignee');

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:dxos.org/type/Task:0.1.0",
              ],
            },
            "spaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
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
          {
            "_tag": "FilterDeletedStep",
            "mode": "only-non-deleted",
          },
        ],
      }
    `);
  });

  test('contact full-text search', () => {
    const query = Query.select(Filter.text('Bill')).select(Filter.type(TestSchema.Person));

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "selector": {
              "_tag": "TextSelector",
              "searchKind": "full-text",
              "text": "Bill",
            },
            "spaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
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
        ],
      }
    `);
  });

  test('select multiple types', () => {
    const query = Query.select(Filter.or(Filter.type(TestSchema.Organization), Filter.type(TestSchema.Person)));

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:dxos.org/type/Organization:0.1.0",
                "dxn:type:dxos.org/type/Person:0.1.0",
              ],
            },
            "spaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
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
    const query = Query.select(
      Filter.not(Filter.or(Filter.type(TestSchema.Organization), Filter.type(TestSchema.Person))),
    );

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "selector": {
              "_tag": "TypeSelector",
              "inverted": true,
              "typename": [
                "dxn:type:dxos.org/type/Organization:0.1.0",
                "dxn:type:dxos.org/type/Person:0.1.0",
              ],
            },
            "spaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
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
    const query = Query.select(Filter.type(TestSchema.Task)).options({ deleted: 'only' });

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:dxos.org/type/Task:0.1.0",
              ],
            },
            "spaces": [
              "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
            ],
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
