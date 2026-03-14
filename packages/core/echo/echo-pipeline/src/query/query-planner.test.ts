//
// Copyright 2025 example.com
//

//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Filter, Order, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { type QueryAST } from '@dxos/echo-protocol';
import { DXN, SpaceId } from '@dxos/keys';

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
            "scope": {
              "spaceIds": [
                "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              ],
            },
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:com.example.type.person:0.1.0",
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
              "typename": "dxn:type:com.example.type.person:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
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
            "scope": {
              "spaceIds": [
                "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              ],
            },
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:com.example.type.person:0.1.0",
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
              "typename": "dxn:type:com.example.type.person:0.1.0",
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
            "scope": {
              "spaceIds": [
                "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              ],
            },
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:com.example.type.person:0.1.0",
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
              "typename": "dxn:type:com.example.type.person:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
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
            "scope": {
              "spaceIds": [
                "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              ],
            },
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
              "typename": "dxn:type:com.example.type.person:0.1.0",
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
              "typename": "dxn:type:com.example.type.employed-by:0.1.0",
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
            "scope": {
              "spaceIds": [
                "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              ],
            },
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
              "typename": "dxn:type:com.example.type.person:0.1.0",
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
              "typename": "dxn:type:com.example.type.task:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
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
            "scope": {
              "spaceIds": [
                "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              ],
            },
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:com.example.type.organization:0.1.0",
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
              "typename": "dxn:type:com.example.type.organization:0.1.0",
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
              "typename": "dxn:type:com.example.type.employed-by:0.1.0",
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
              "typename": "dxn:type:com.example.type.task:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
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
                    "scope": {
                      "spaceIds": [
                        "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
                      ],
                    },
                    "selector": {
                      "_tag": "TypeSelector",
                      "inverted": false,
                      "typename": [
                        "dxn:type:com.example.type.person:0.1.0",
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
                      "typename": "dxn:type:com.example.type.person:0.1.0",
                    },
                  },
                  {
                    "_tag": "OrderStep",
                    "order": [
                      {
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
                    "scope": {
                      "spaceIds": [
                        "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
                      ],
                    },
                    "selector": {
                      "_tag": "TypeSelector",
                      "inverted": false,
                      "typename": [
                        "dxn:type:com.example.type.organization:0.1.0",
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
                      "typename": "dxn:type:com.example.type.organization:0.1.0",
                    },
                  },
                  {
                    "_tag": "OrderStep",
                    "order": [
                      {
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
                  "scope": {
                    "spaceIds": [
                      "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
                    ],
                  },
                  "selector": {
                    "_tag": "TypeSelector",
                    "inverted": false,
                    "typename": [
                      "dxn:type:com.example.type.person:0.1.0",
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
                    "typename": "dxn:type:com.example.type.person:0.1.0",
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
                    "typename": "dxn:type:com.example.type.employed-by:0.1.0",
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
                  "scope": {
                    "spaceIds": [
                      "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
                    ],
                  },
                  "selector": {
                    "_tag": "TypeSelector",
                    "inverted": false,
                    "typename": [
                      "dxn:type:com.example.type.person:0.1.0",
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
                    "typename": "dxn:type:com.example.type.person:0.1.0",
                  },
                },
                {
                  "_tag": "OrderStep",
                  "order": [
                    {
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
            "scope": {
              "spaceIds": [
                "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              ],
            },
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:com.example.type.task:0.1.0",
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
              "typename": "dxn:type:com.example.type.task:0.1.0",
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
            "scope": {
              "spaceIds": [
                "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              ],
            },
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
              "typename": "dxn:type:com.example.type.person:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
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
            "scope": {
              "spaceIds": [
                "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              ],
            },
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
            "scope": {
              "spaceIds": [
                "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              ],
            },
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:com.example.type.organization:0.1.0",
                "dxn:type:com.example.type.person:0.1.0",
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
                  "typename": "dxn:type:com.example.type.organization:0.1.0",
                },
                {
                  "id": undefined,
                  "props": {},
                  "type": "object",
                  "typename": "dxn:type:com.example.type.person:0.1.0",
                },
              ],
              "type": "or",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });

  // TODO(dmaretskyi): Implement this.
  test.skip('select everything but the type', () => {
    const query = Query.select(Filter.not(Filter.type(TestSchema.Person)));

    const plan = planner.createPlan(withSpaceIdOptions(query.ast));
    expect(plan).toMatchInlineSnapshot();
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
            "scope": {
              "spaceIds": [
                "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              ],
            },
            "selector": {
              "_tag": "TypeSelector",
              "inverted": true,
              "typename": [
                "dxn:type:com.example.type.organization:0.1.0",
                "dxn:type:com.example.type.person:0.1.0",
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
                  "typename": "dxn:type:com.example.type.organization:0.1.0",
                },
                {
                  "id": undefined,
                  "props": {},
                  "type": "object",
                  "typename": "dxn:type:com.example.type.person:0.1.0",
                },
              ],
              "type": "or",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
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
            "scope": {
              "spaceIds": [
                "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              ],
            },
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:com.example.type.task:0.1.0",
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
              "typename": "dxn:type:com.example.type.task:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });

  test('select items from a specific queue', () => {
    const query = Query.select(Filter.type(TestSchema.Task)).from({ queues: [QUEUE_DXN] });

    const plan = planner.createPlan(query.ast);
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "scope": {
              "queues": [
                "dxn:queue:data:B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO:01JJRA86VK4H1TEB6QQVSWXP0E",
              ],
            },
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:com.example.type.task:0.1.0",
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
              "typename": "dxn:type:com.example.type.task:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });

  test('select items from all queues in a space', () => {
    const query = Query.select(Filter.type(TestSchema.Task)).from({
      spaceIds: [SPACE_ID],
      allQueuesFromSpaces: true,
    });

    const plan = planner.createPlan(query.ast);
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "scope": {
              "allQueuesFromSpaces": true,
              "spaceIds": [
                "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              ],
            },
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:com.example.type.task:0.1.0",
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
              "typename": "dxn:type:com.example.type.task:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
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
            "scope": {
              "spaceIds": [
                "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              ],
            },
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:com.example.type.task:0.1.0",
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
              "typename": "dxn:type:com.example.type.task:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "limit": 10,
            "order": [
              {
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
            "limit": 10,
            "scope": {
              "spaceIds": [
                "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              ],
            },
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:com.example.type.task:0.1.0",
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
              "typename": "dxn:type:com.example.type.task:0.1.0",
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
                    "scope": {
                      "spaceIds": [
                        "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
                      ],
                    },
                    "selector": {
                      "_tag": "TypeSelector",
                      "inverted": false,
                      "typename": [
                        "dxn:type:com.example.type.person:0.1.0",
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
                      "typename": "dxn:type:com.example.type.person:0.1.0",
                    },
                  },
                  {
                    "_tag": "OrderStep",
                    "limit": 5,
                    "order": [
                      {
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
                    "scope": {
                      "spaceIds": [
                        "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
                      ],
                    },
                    "selector": {
                      "_tag": "TypeSelector",
                      "inverted": false,
                      "typename": [
                        "dxn:type:com.example.type.organization:0.1.0",
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
                      "typename": "dxn:type:com.example.type.organization:0.1.0",
                    },
                  },
                  {
                    "_tag": "OrderStep",
                    "limit": 5,
                    "order": [
                      {
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

  test('from all accessible spaces', () => {
    const query = Query.select(Filter.type(TestSchema.Person)).from('all-accessible-spaces');

    const plan = planner.createPlan(query.ast);
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "scope": {},
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:com.example.type.person:0.1.0",
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
              "typename": "dxn:type:com.example.type.person:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
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
            "scope": {
              "allQueuesFromSpaces": true,
            },
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:com.example.type.person:0.1.0",
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
              "typename": "dxn:type:com.example.type.person:0.1.0",
            },
          },
          {
            "_tag": "OrderStep",
            "order": [
              {
                "kind": "natural",
              },
            ],
          },
        ],
      }
    `);
  });

  test('from specific feed via queues scope', () => {
    const query = Query.select(Filter.type(TestSchema.Task)).from({ queues: [QUEUE_DXN] });

    const plan = planner.createPlan(query.ast);
    expect(plan.steps[0]).toMatchObject({
      _tag: 'SelectStep',
      scope: { queues: [QUEUE_DXN] },
    });
  });

  test('from specific space with feeds', () => {
    const query = Query.select(Filter.type(TestSchema.Person)).from({
      spaceIds: [SPACE_ID],
      allQueuesFromSpaces: true,
    });

    const plan = planner.createPlan(query.ast);
    expect(plan.steps[0]).toMatchObject({
      _tag: 'SelectStep',
      scope: { spaceIds: [SPACE_ID], allQueuesFromSpaces: true },
    });
  });

  test('from subquery flattens into filter on subquery results', () => {
    // Query.select(Filter.props({ name: 'Alice' })).from(Query.select(Filter.type(Person)))
    // Should flatten to: select type Person -> filter props { name: 'Alice' }.
    const subquery = Query.select(Filter.type(TestSchema.Person)).from({ spaceIds: [SPACE_ID] });
    const query = Query.select(Filter.props<TestSchema.Person>({ name: 'Alice' })).from(subquery);

    const plan = planner.createPlan(query.ast);
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "scope": {
              "spaceIds": [
                "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              ],
            },
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:com.example.type.person:0.1.0",
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
              "typename": "dxn:type:com.example.type.person:0.1.0",
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
    const subquery = Query.select(Filter.type(TestSchema.Person)).from({ spaceIds: [SPACE_ID] });
    const query = Query.select(Filter.type(TestSchema.Task)).reference('assignee').from(subquery);

    const plan = planner.createPlan(query.ast);
    expect(plan).toMatchInlineSnapshot(`
      {
        "steps": [
          {
            "_tag": "SelectStep",
            "scope": {
              "spaceIds": [
                "B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO",
              ],
            },
            "selector": {
              "_tag": "TypeSelector",
              "inverted": false,
              "typename": [
                "dxn:type:com.example.type.person:0.1.0",
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
              "typename": "dxn:type:com.example.type.person:0.1.0",
            },
          },
          {
            "_tag": "FilterStep",
            "filter": {
              "id": undefined,
              "props": {},
              "type": "object",
              "typename": "dxn:type:com.example.type.task:0.1.0",
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
    const subquery = Query.select(Filter.type(TestSchema.Task)).from({ spaceIds: [SPACE_ID] });
    const query = Query.select(Filter.props<TestSchema.Task>({ title: 'Test' })).from(subquery);

    const plan = planner.createPlan(query.ast);
    const selectStep = plan.steps.find((step) => step._tag === 'SelectStep');
    expect(selectStep).toMatchObject({
      _tag: 'SelectStep',
      scope: { spaceIds: [SPACE_ID] },
    });
  });
});

const SPACE_ID = SpaceId.make('B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO'); // Stable id for inline snapshots.
const QUEUE_DXN = DXN.parse('dxn:queue:data:B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO:01JJRA86VK4H1TEB6QQVSWXP0E').toString(); // Stable queue DXN for inline snapshots.

const withSpaceIdOptions = (query: QueryAST.Query): QueryAST.Query => ({
  type: 'from',
  query,
  from: {
    _tag: 'scope',
    scope: {
      spaceIds: [SPACE_ID],
    },
  },
});
