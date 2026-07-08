//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Aggregate, Filter, GroupKey, Order, Query, Ref } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { TestSchema } from '@dxos/echo/testing';
import { EID, EntityId, SpaceId } from '@dxos/keys';

import { QueryPlanner } from './query-planner';

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
            "scope": [
              {
                "_tag": "space",
                "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              },
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:com.example.type.person:0.1.0",
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
              "typename": "dxn:com.example.type.person:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });

  test('get all people ordered by name', () => {
    const query = Query.select(Filter.type(TestSchema.Person)).orderBy(Order.property('name', 'asc'));

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "scope": [
              {
                "_tag": "space",
                "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              },
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:com.example.type.person:0.1.0",
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
              "typename": "dxn:com.example.type.person:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "property",
                "property": "name",
              },
            ],
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
            "scope": [
              {
                "_tag": "space",
                "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              },
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:com.example.type.person:0.1.0",
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
              "typename": "dxn:com.example.type.person:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });

  test('get all orgs Fred worked for since 2020', () => {
    const query = Query.select(Filter.type(TestSchema.Person, { id: '01JVS9YYT5VMVJW0GGTM1YHCCH' }))
      .sourceOf(TestSchema.EmployedBy, {
        since: Filter.gt<string | undefined>('2020'),
      })
      .target();

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "scope": [
              {
                "_tag": "space",
                "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              },
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
              "typename": "dxn:com.example.type.person:0.1.0",
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
              "typename": "dxn:com.example.type.employedBy:0.1.0",
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
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
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
            "scope": [
              {
                "_tag": "space",
                "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              },
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
              "typename": "dxn:com.example.type.person:0.1.0",
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
              "typename": "dxn:com.example.type.task:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });

  test('get all tasks for employees of Cyberdyne', () => {
    const query = Query.select(Filter.type(TestSchema.Organization, { name: 'Cyberdyne' }))
      .targetOf(TestSchema.EmployedBy)
      .source()
      .referencedBy(TestSchema.Task, 'assignee');

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "scope": [
              {
                "_tag": "space",
                "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              },
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:com.example.type.organization:0.1.0",
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
              "typename": "dxn:com.example.type.organization:0.1.0",
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
              "typename": "dxn:com.example.type.employedBy:0.1.0",
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
              "typename": "dxn:com.example.type.task:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
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
                    "scope": [
                      {
                        "_tag": "space",
                        "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
                      },
                    ],
                    "selector": {
                      "_tag": "TypeSelector",
                      "inverted": false,
                      "typename": [
                        "dxn:com.example.type.person:0.1.0",
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
                      "typename": "dxn:com.example.type.person:0.1.0",
                    },
                  },
                  {
                    "_tag": "OrderStep",
                    "order": [
                      {
                        "direction": "asc",
                        "kind": "natural",
                      },
                    ],
                  },
                ],
              },
              {
                "steps": [
                  {
                    "_tag": "SelectStep",
                    "scope": [
                      {
                        "_tag": "space",
                        "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
                      },
                    ],
                    "selector": {
                      "_tag": "TypeSelector",
                      "inverted": false,
                      "typename": [
                        "dxn:com.example.type.organization:0.1.0",
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
                      "typename": "dxn:com.example.type.organization:0.1.0",
                    },
                  },
                  {
                    "_tag": "OrderStep",
                    "order": [
                      {
                        "direction": "asc",
                        "kind": "natural",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });

  test('get all people not in orgs', () => {
    const query = Query.without(
      Query.select(Filter.type(TestSchema.Person)),
      Query.select(Filter.type(TestSchema.Person)).sourceOf(TestSchema.EmployedBy).source(),
    );

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SetDifferenceStep",
            "exclude": {
              "steps": [
                {
                  "_tag": "SelectStep",
                  "scope": [
                    {
                      "_tag": "space",
                      "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
                    },
                  ],
                  "selector": {
                    "_tag": "TypeSelector",
                    "inverted": false,
                    "typename": [
                      "dxn:com.example.type.person:0.1.0",
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
                    "typename": "dxn:com.example.type.person:0.1.0",
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
                    "props": {},
                    "type": "object",
                    "typename": "dxn:com.example.type.employedBy:0.1.0",
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
                  "_tag": "OrderStep",
                  "order": [
                    {
                      "direction": "asc",
                      "kind": "natural",
                    },
                  ],
                },
              ],
            },
            "source": {
              "steps": [
                {
                  "_tag": "SelectStep",
                  "scope": [
                    {
                      "_tag": "space",
                      "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
                    },
                  ],
                  "selector": {
                    "_tag": "TypeSelector",
                    "inverted": false,
                    "typename": [
                      "dxn:com.example.type.person:0.1.0",
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
                    "typename": "dxn:com.example.type.person:0.1.0",
                  },
                },
                {
                  "_tag": "OrderStep",
                  "order": [
                    {
                      "direction": "asc",
                      "kind": "natural",
                    },
                  ],
                },
              ],
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });

  test('get assignees of all tasks created after 2020', () => {
    const query = Query.select(
      Filter.type(TestSchema.Task, {
        deadline: Filter.gt<string | undefined>('2020'),
      }),
    ).reference('assignee');

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "scope": [
              {
                "_tag": "space",
                "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              },
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:com.example.type.task:0.1.0",
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
                "deadline": {
                  "operator": "gt",
                  "type": "compare",
                  "value": "2020",
                },
              },
              "type": "object",
              "typename": "dxn:com.example.type.task:0.1.0",
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
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
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
            "scope": [
              {
                "_tag": "space",
                "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              },
            ],
            "selector": {
              "_tag": "TextSelector",
              "searchKind": "full-text",
              "text": "Bill",
              "typename": null,
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
              "typename": "dxn:com.example.type.person:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });

  test('vector search', () => {
    const query = Query.select(Filter.text('Bill', { type: 'vector' }));

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "scope": [
              {
                "_tag": "space",
                "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              },
            ],
            "selector": {
              "_tag": "TextSelector",
              "searchKind": "vector",
              "text": "Bill",
              "typename": null,
            },
          },
          {
            "_tag": "FilterDeletedStep",
            "mode": "only-non-deleted",
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
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
            "scope": [
              {
                "_tag": "space",
                "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              },
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:com.example.type.organization:0.1.0",
                "dxn:com.example.type.person:0.1.0",
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
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });

  test('select everything but the type', () => {
    const query = Query.select(Filter.not(Filter.type(TestSchema.Person)));

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "scope": [
              {
                "_tag": "space",
                "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              },
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": true,
              "typename": [
                "dxn:com.example.type.person:0.1.0",
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
              "filter": {
                "id": undefined,
                "props": {},
                "type": "object",
                "typename": "dxn:com.example.type.person:0.1.0",
              },
              "type": "not",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
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
            "scope": [
              {
                "_tag": "space",
                "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              },
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": true,
              "typename": [
                "dxn:com.example.type.organization:0.1.0",
                "dxn:com.example.type.person:0.1.0",
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
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
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
            "scope": [
              {
                "_tag": "space",
                "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              },
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:com.example.type.task:0.1.0",
              ],
            },
          },
          {
            "_tag": "FilterDeletedStep",
            "mode": "only-deleted",
          },
          {
            "_tag": "FilterStep",
            "filter": {
              "id": undefined,
              "props": {},
              "type": "object",
              "typename": "dxn:com.example.type.task:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });

  test('select items from a specific feed', () => {
    const query = Query.select(Filter.type(TestSchema.Task)).from([{ _tag: 'feed', feedUri: QUEUE_DXN }]);

    const plan = planner.createPlan(query.ast);
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "scope": [
              {
                "_tag": "feed",
                "feedUri": "echo://B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO/01JJRA86VK4H1TEB6QQVSWXP0E",
              },
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:com.example.type.task:0.1.0",
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
              "typename": "dxn:com.example.type.task:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });

  test('select items from all feeds in a space', () => {
    const query = Query.select(Filter.type(TestSchema.Task)).from([
      { _tag: 'space', spaceId: SPACE_ID, includeAllFeeds: true },
    ]);

    const plan = planner.createPlan(query.ast);
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "scope": [
              {
                "_tag": "space",
                "includeAllFeeds": true,
                "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              },
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:com.example.type.task:0.1.0",
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
              "typename": "dxn:com.example.type.task:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });

  test('limit results', () => {
    const query = Query.select(Filter.type(TestSchema.Task)).limit(10);

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "limit": 10,
            "scope": [
              {
                "_tag": "space",
                "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              },
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:com.example.type.task:0.1.0",
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
              "typename": "dxn:com.example.type.task:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "limit": 10,
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });

  test('ordered and limited results', () => {
    const query = Query.select(Filter.type(TestSchema.Task)).orderBy(Order.property('title', 'asc')).limit(10);

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "scope": [
              {
                "_tag": "space",
                "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              },
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:com.example.type.task:0.1.0",
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
              "typename": "dxn:com.example.type.task:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "limit": 10,
            "order": [
              {
                "direction": "asc",
                "kind": "property",
                "property": "title",
              },
            ],
          },
        ],
      }
    `);
  });

  test('ordered, skipped, and limited results: skip is added to the propagated cap; the limit step is removed', () => {
    const query = Query.select(Filter.type(TestSchema.Task)).orderBy(Order.property('title', 'asc')).skip(5).limit(10);

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));

    // The OrderStep caps to skip(5) + limit(10) = 15 so that 10 survive the skip (propagating a bare
    // 10 would truncate before the skip and yield only 5). The SkipStep remains to trim the top-15
    // back to the [5, 15) window; the LimitStep is redundant once the cap is propagated and is removed.
    const orderStep = plan.steps.find((step) => step._tag === 'OrderStep');
    expect(orderStep?._tag === 'OrderStep' && orderStep.limit).toBe(15);
    expect(plan.steps.some((step) => step._tag === 'SkipStep' && step.skip === 5)).toBe(true);
    expect(plan.steps.some((step) => step._tag === 'LimitStep')).toBe(false);
  });

  test('union of limited queries', () => {
    const query = Query.all(
      Query.select(Filter.type(TestSchema.Person)).limit(5),
      Query.select(Filter.type(TestSchema.Organization)).limit(5),
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
                    "limit": 5,
                    "scope": [
                      {
                        "_tag": "space",
                        "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
                      },
                    ],
                    "selector": {
                      "_tag": "TypeSelector",
                      "inverted": false,
                      "typename": [
                        "dxn:com.example.type.person:0.1.0",
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
                      "typename": "dxn:com.example.type.person:0.1.0",
                    },
                  },
                  {
                    "_tag": "OrderStep",
                    "limit": 5,
                    "order": [
                      {
                        "direction": "asc",
                        "kind": "natural",
                      },
                    ],
                  },
                ],
              },
              {
                "steps": [
                  {
                    "_tag": "SelectStep",
                    "limit": 5,
                    "scope": [
                      {
                        "_tag": "space",
                        "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
                      },
                    ],
                    "selector": {
                      "_tag": "TypeSelector",
                      "inverted": false,
                      "typename": [
                        "dxn:com.example.type.organization:0.1.0",
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
                      "typename": "dxn:com.example.type.organization:0.1.0",
                    },
                  },
                  {
                    "_tag": "OrderStep",
                    "limit": 5,
                    "order": [
                      {
                        "direction": "asc",
                        "kind": "natural",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });
  test('throws when query has no from clause', () => {
    const query = Query.select(Filter.type(TestSchema.Person));
    expect(() => planner.createPlan(query.ast)).toThrow('Query must be scoped with a from() clause');
  });

  describe('groupBy', () => {
    test('group by single property inserts a natural OrderStep before GroupByStep', () => {
      const query = Query.select(Filter.type(TestSchema.Task)).groupBy(GroupKey.property('title'));

      const plan = planner.createPlan(withSpaceIdOptions(query.ast));
      const tags = plan.steps.map((step) => step._tag);
      expect(tags).toEqual(['SelectStep', 'FilterDeletedStep', 'FilterStep', 'OrderStep', 'GroupByStep']);

      const orderStep = plan.steps.find((step) => step._tag === 'OrderStep');
      expect(orderStep).toMatchObject({ order: [{ kind: 'natural', direction: 'asc' }] });

      const groupByStep = plan.steps.find((step) => step._tag === 'GroupByStep');
      expect(groupByStep).toMatchObject({ keys: [{ kind: 'property', property: 'title' }] });
    });

    test('an explicit orderBy before groupBy is preserved (no natural order inserted)', () => {
      const query = Query.select(Filter.type(TestSchema.Task))
        .orderBy(Order.property('title', 'desc'))
        .groupBy(GroupKey.property('title'));

      const plan = planner.createPlan(withSpaceIdOptions(query.ast));
      const tags = plan.steps.map((step) => step._tag);
      expect(tags).toEqual(['SelectStep', 'FilterDeletedStep', 'FilterStep', 'OrderStep', 'GroupByStep']);

      const orderStep = plan.steps.find((step) => step._tag === 'OrderStep');
      expect(orderStep).toMatchObject({ order: [{ kind: 'property', property: 'title', direction: 'desc' }] });
    });

    test('multi-key groupBy carries all keys on GroupByStep', () => {
      const query = Query.select(Filter.type(TestSchema.Task)).groupBy(
        GroupKey.property('title'),
        GroupKey.property('id'),
      );

      const plan = planner.createPlan(withSpaceIdOptions(query.ast));
      const groupByStep = plan.steps.find((step) => step._tag === 'GroupByStep');
      expect(groupByStep).toMatchObject({
        keys: [
          { kind: 'property', property: 'title' },
          { kind: 'property', property: 'id' },
        ],
      });
    });

    test('limit before groupBy stays before GroupByStep with no pushdown across it', () => {
      const query = Query.select(Filter.type(TestSchema.Task))
        .orderBy(Order.property('title', 'asc'))
        .limit(10)
        .groupBy(GroupKey.property('title'));

      const plan = planner.createPlan(withSpaceIdOptions(query.ast));
      const tags = plan.steps.map((step) => step._tag);
      // No optimizeLimits pushdown: LimitStep remains a distinct step (not folded into SelectStep/OrderStep).
      expect(tags).toEqual(['SelectStep', 'FilterDeletedStep', 'FilterStep', 'OrderStep', 'LimitStep', 'GroupByStep']);

      const limitStep = plan.steps.find((step) => step._tag === 'LimitStep');
      expect(limitStep).toMatchObject({ limit: 10 });
    });

    test('limit after groupBy pages over groups (stays after GroupByStep, no pushdown)', () => {
      const query = Query.select(Filter.type(TestSchema.Task)).groupBy(GroupKey.property('title')).limit(5);

      const plan = planner.createPlan(withSpaceIdOptions(query.ast));
      const tags = plan.steps.map((step) => step._tag);
      expect(tags).toEqual(['SelectStep', 'FilterDeletedStep', 'FilterStep', 'OrderStep', 'GroupByStep', 'LimitStep']);

      // The group-level limit must NOT be pushed into the SelectStep/OrderStep.
      const selectStep = plan.steps.find((step) => step._tag === 'SelectStep');
      expect((selectStep as any).limit).toBeUndefined();
      const orderStep = plan.steps.find((step) => step._tag === 'OrderStep');
      expect((orderStep as any).limit).toBeUndefined();
      const limitStep = plan.steps.find((step) => step._tag === 'LimitStep');
      expect(limitStep).toMatchObject({ limit: 5 });
    });

    test('skip + limit after groupBy pages over groups', () => {
      const query = Query.select(Filter.type(TestSchema.Task)).groupBy(GroupKey.property('title')).skip(2).limit(5);

      const plan = planner.createPlan(withSpaceIdOptions(query.ast));
      const tags = plan.steps.map((step) => step._tag);
      expect(tags).toEqual([
        'SelectStep',
        'FilterDeletedStep',
        'FilterStep',
        'OrderStep',
        'GroupByStep',
        'SkipStep',
        'LimitStep',
      ]);
    });

    test('GroupByStep carries declared aggregates', () => {
      const query = Query.select(Filter.type(TestSchema.Task))
        .groupBy(GroupKey.property('title'))
        .aggregate({ latest: Aggregate.max('title') });

      const plan = planner.createPlan(withSpaceIdOptions(query.ast));
      const groupByStep = plan.steps.find((step) => step._tag === 'GroupByStep');
      expect(groupByStep).toMatchObject({
        keys: [{ kind: 'property', property: 'title' }],
        aggregates: [{ name: 'latest', kind: 'max', property: 'title' }],
      });
    });

    test('orderBy(Order.aggregate) after groupBy is a group-level OrderStep after GroupByStep', () => {
      const query = Query.select(Filter.type(TestSchema.Task))
        .orderBy(Order.property('title', 'desc'))
        .groupBy(GroupKey.property('title'))
        .aggregate({ latest: Aggregate.max('title') })
        .orderBy(Order.aggregate('latest', 'desc'))
        .limit(5);

      const plan = planner.createPlan(withSpaceIdOptions(query.ast));
      const tags = plan.steps.map((step) => step._tag);
      // Within-group OrderStep, then GroupByStep, then the group-level OrderStep (which absorbs the
      // group-level limit via optimizeLimits — it pages over whole groups, so no separate LimitStep).
      expect(tags).toEqual(['SelectStep', 'FilterDeletedStep', 'FilterStep', 'OrderStep', 'GroupByStep', 'OrderStep']);

      const groupOrderStep = plan.steps[plan.steps.length - 1];
      expect(groupOrderStep).toMatchObject({
        _tag: 'OrderStep',
        order: [{ kind: 'aggregate', name: 'latest', direction: 'desc' }],
        limit: 5,
      });
    });

    test('throws when groupBy is nested inside another groupBy', () => {
      const inner = Query.select(Filter.type(TestSchema.Task)).groupBy(GroupKey.property('title'));
      // Raw AST composition: an inner query with its own groupBy, wrapped by an outer groupBy.
      const query = Query.fromAst({ type: 'group-by', query: inner.ast, keys: [{ kind: 'property', property: 'id' }] });

      expect(() => planner.createPlan(withSpaceIdOptions(query.ast))).toThrow('Only one groupBy clause is supported');
    });

    test('throws when a grouped subquery is used as a from() source', () => {
      // The planner flattens `.from(subquery)`; a grouped subquery would merge a second group-by
      // into the plan, so it must be rejected even though the outer query has no group-by of its own.
      const groupedSubquery = Query.select(Filter.type(TestSchema.Person)).groupBy(GroupKey.property('email'));
      const query = Query.select(Filter.type(TestSchema.Task)).from(groupedSubquery);

      expect(() => planner.createPlan(withSpaceIdOptions(query.ast))).toThrow(
        'groupBy must be the outermost query clause',
      );
    });

    test('throws when both the outer query and a from() subquery are grouped', () => {
      const groupedSubquery = Query.select(Filter.type(TestSchema.Person)).groupBy(GroupKey.property('email'));
      const query = Query.select(Filter.type(TestSchema.Task))
        .from(groupedSubquery)
        .groupBy(GroupKey.property('title'));

      expect(() => planner.createPlan(withSpaceIdOptions(query.ast))).toThrow('Only one groupBy clause is supported');
    });

    test('groupBy under from()/options() is still valid (outermost data clause)', () => {
      const query = Query.select(Filter.type(TestSchema.Task)).groupBy(GroupKey.property('title')).options({
        debugLabel: 'grouped',
      });

      const plan = planner.createPlan(withSpaceIdOptions(query.ast));
      expect(plan.steps.some((step) => step._tag === 'GroupByStep')).toBe(true);
    });
  });

  test('from all accessible spaces', () => {
    const query = Query.select(Filter.type(TestSchema.Person)).from('all-accessible-spaces');

    const plan = planner.createPlan(query.ast);
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "scope": [],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:com.example.type.person:0.1.0",
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
              "typename": "dxn:com.example.type.person:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });

  test('from all accessible spaces with feeds', () => {
    const query = Query.select(Filter.type(TestSchema.Person)).from('all-accessible-spaces', {
      includeFeeds: true,
    });

    const plan = planner.createPlan(query.ast);
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "scope": [],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:com.example.type.person:0.1.0",
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
              "typename": "dxn:com.example.type.person:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });

  test('from specific feed via feeds scope', () => {
    const query = Query.select(Filter.type(TestSchema.Task)).from([{ _tag: 'feed', feedUri: QUEUE_DXN }]);

    const plan = planner.createPlan(query.ast);
    expect(plan.steps[0]).toMatchObject({
      _tag: 'SelectStep',
      scope: [{ _tag: 'feed' }],
    });
  });

  test('from specific space with feeds', () => {
    const query = Query.select(Filter.type(TestSchema.Person)).from([
      { _tag: 'space', spaceId: SPACE_ID, includeAllFeeds: true },
    ]);

    const plan = planner.createPlan(query.ast);
    expect(plan.steps[0]).toMatchObject({
      _tag: 'SelectStep',
      scope: [{ _tag: 'space', spaceId: SPACE_ID, includeAllFeeds: true }],
    });
  });

  test('from subquery flattens into filter on subquery results', () => {
    // Query.select(Filter.props({ name: 'Alice' })).from(Query.select(Filter.type(Person)))
    // Should flatten to: select type Person -> filter props { name: 'Alice' }.
    const subquery = Query.select(Filter.type(TestSchema.Person)).from([{ _tag: 'space', spaceId: SPACE_ID }]);
    const query = Query.select(Filter.props<TestSchema.Person>({ name: 'Alice' })).from(subquery);

    const plan = planner.createPlan(query.ast);
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "scope": [
              {
                "_tag": "space",
                "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              },
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:com.example.type.person:0.1.0",
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
              "typename": "dxn:com.example.type.person:0.1.0",
            },
          },
          {
            "_tag": "FilterStep",
            "filter": {
              "id": undefined,
              "props": {
                "name": {
                  "operator": "eq",
                  "type": "compare",
                  "value": "Alice",
                },
              },
              "type": "object",
              "typename": null,
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });

  test('from subquery with reference traversal', () => {
    // Query.select(Filter.type(Task)).reference('assignee').from(subquery)
    // The reference traversal wraps the outer select; flattening should still work.
    const subquery = Query.select(Filter.type(TestSchema.Person)).from([{ _tag: 'space' as const, spaceId: SPACE_ID }]);
    const query = Query.select(Filter.type(TestSchema.Task)).reference('assignee').from(subquery);

    const plan = planner.createPlan(query.ast);
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "scope": [
              {
                "_tag": "space",
                "spaceId": "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              },
            ],
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:com.example.type.person:0.1.0",
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
              "typename": "dxn:com.example.type.person:0.1.0",
            },
          },
          {
            "_tag": "FilterStep",
            "filter": {
              "id": undefined,
              "props": {},
              "type": "object",
              "typename": "dxn:com.example.type.task:0.1.0",
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
          {
            "_tag": "OrderStep",
            "order": [
              {
                "direction": "asc",
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });

  test('from subquery inherits scope from inner query', () => {
    // The outer query has no scope — the subquery carries the scope.
    const subquery = Query.select(Filter.type(TestSchema.Task)).from([{ _tag: 'space', spaceId: SPACE_ID }]);
    const query = Query.select(Filter.props<TestSchema.Task>({ title: 'Test' })).from(subquery);

    const plan = planner.createPlan(query.ast);
    const selectStep = plan.steps.find((step) => step._tag === 'SelectStep');
    expect(selectStep).toMatchObject({
      _tag: 'SelectStep',
      scope: [{ _tag: 'space', spaceId: SPACE_ID }],
    });
  });

  test('and(type, compare, timestamp) throws descriptive error about timestamp limitation', () => {
    const query = Query.select(
      Filter.and(
        Filter.type(TestSchema.Person),
        Filter.type(TestSchema.Person, { name: 'Alice' }),
        Filter.updated({ after: Date.now() }),
      ),
    );
    expect(() => planner.createPlan(withSpaceIdOptions(query.ast))).toThrow(/[Tt]imestamp/);
  });

  test('and(type, timestamp) produces valid plan', () => {
    const query = Query.select(Filter.and(Filter.type(TestSchema.Person), Filter.updated({ after: Date.now() })));
    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    const hasTimestampFilter = plan.steps.some(
      (step) => step._tag === 'FilterStep' && JSON.stringify(step.filter).includes('timestamp'),
    );
    expect(hasTimestampFilter).toBe(true);
  });

  test('childOf with limit: limit must not be propagated into the SelectStep', () => {
    // Regression: when a child-of FilterStep sits between SelectStep and LimitStep, pushing
    // the limit into the SelectStep slices candidates before the filter runs and starves the
    // result set (e.g. wildcard select grabs 10 random objects, then child-of leaves 0).
    const parentRef = Ref.fromURI(EID.make({ entityId: EntityId.make('01J7XKZ6E3MZRY7H9TGFR3W6CN') }));
    const query = Query.select(Filter.everything()).select(Filter.childOf(parentRef)).limit(10);

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    const selectStep = plan.steps.find((step) => step._tag === 'SelectStep');
    expect(selectStep).toBeDefined();
    expect((selectStep as any).limit).toBeUndefined();
    const hasLimitStep = plan.steps.some((step) => step._tag === 'LimitStep');
    const orderWithLimit = plan.steps.some((step) => step._tag === 'OrderStep' && (step as any).limit === 10);
    expect(hasLimitStep || orderWithLimit).toBe(true);
  });
});

const SPACE_ID = SpaceId.make('B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO'); // Stable id for inline snapshots.
// Stable queue EID for inline snapshots.
const QUEUE_DXN = EID.make({ spaceId: SPACE_ID, entityId: EntityId.make('01JJRA86VK4H1TEB6QQVSWXP0E') });

const withSpaceIdOptions = (query: QueryAST.Query): QueryAST.Query => ({
  type: 'from',
  query,
  from: {
    _tag: 'scope',
    scopes: [{ _tag: 'space', spaceId: SPACE_ID }],
  },
});
