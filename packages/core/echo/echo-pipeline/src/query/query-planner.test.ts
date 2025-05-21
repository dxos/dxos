//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type QueryAST } from '@dxos/echo-protocol';
import { DXN, SpaceId } from '@dxos/keys';

import type { QueryPlan } from './plan';
import { QueryPlanner } from './query-planner';

// Type name constants
const PERSON_TYPENAME = DXN.fromTypenameAndVersion('dxos.org/type/Person', '0.1.0').toString();
const ORGANIZATION_TYPENAME = DXN.fromTypenameAndVersion('dxos.org/type/Organization', '0.1.0').toString();
const TASK_TYPENAME = DXN.fromTypenameAndVersion('dxos.org/type/Task', '0.1.0').toString();
const WORK_FOR_TYPENAME = DXN.fromTypenameAndVersion('dxos.org/type/WorksFor', '0.1.0').toString();

describe('QueryPlanner', () => {
  const planner = new QueryPlanner();

  test('get all people', () => {
    const query: QueryAST.Query = {
      type: 'select',
      filter: {
        type: 'object',
        typename: PERSON_TYPENAME,
        props: {},
      },
    };

    const plan = planner.createPlan(withSpaceIdOptions(query));
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
    const query: QueryAST.Query = {
      type: 'select',
      filter: {
        type: 'object',
        typename: PERSON_TYPENAME,
        props: {
          name: {
            type: 'compare',
            operator: 'eq',
            value: 'Fred',
          },
        },
      },
    };

    const plan = planner.createPlan(withSpaceIdOptions(query));
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
    const query: QueryAST.Query = {
      type: 'relation-traversal',
      anchor: {
        type: 'relation',
        anchor: {
          type: 'select',
          filter: {
            type: 'object',
            typename: PERSON_TYPENAME,
            id: ['01JVS9YYT5VMVJW0GGTM1YHCCH'],
            props: {},
          },
        },
        direction: 'outgoing',
        filter: {
          type: 'object',
          typename: WORK_FOR_TYPENAME,
          props: {
            since: {
              type: 'compare',
              operator: 'gt',
              value: '2020',
            },
          },
        },
      },
      direction: 'target',
    };

    const plan = planner.createPlan(withSpaceIdOptions(query));
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
    const query: QueryAST.Query = {
      type: 'incoming-references',
      anchor: {
        type: 'select',
        filter: {
          type: 'object',
          typename: PERSON_TYPENAME,
          id: ['01JVS9YYT7H6A6DXRN56RSHT6Z'],
          props: {},
        },
      },
      property: 'assignee',
      typename: TASK_TYPENAME,
    };

    const plan = planner.createPlan(withSpaceIdOptions(query));
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
    const query: QueryAST.Query = {
      type: 'incoming-references',
      anchor: {
        type: 'relation-traversal',
        anchor: {
          type: 'relation',
          anchor: {
            type: 'select',
            filter: {
              type: 'object',
              typename: ORGANIZATION_TYPENAME,
              props: {
                name: {
                  type: 'compare',
                  operator: 'eq',
                  value: 'Cyberdyne',
                },
              },
            },
          },
          direction: 'incoming',
          filter: {
            type: 'object',
            typename: WORK_FOR_TYPENAME,
            props: {},
          },
        },
        direction: 'source',
      },
      property: 'assignee',
      typename: TASK_TYPENAME,
    };

    const plan = planner.createPlan(withSpaceIdOptions(query));
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
    const query: QueryAST.Query = {
      type: 'union',
      queries: [
        {
          type: 'select',
          filter: {
            type: 'object',
            typename: PERSON_TYPENAME,
            props: {},
          },
        },
        {
          type: 'select',
          filter: {
            type: 'object',
            typename: ORGANIZATION_TYPENAME,
            props: {},
          },
        },
      ],
    };

    const plan = planner.createPlan(withSpaceIdOptions(query));
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
    const query: QueryAST.Query = {
      type: 'reference-traversal',
      anchor: {
        type: 'select',
        filter: {
          type: 'object',
          typename: TASK_TYPENAME,
          props: {
            createdAt: {
              type: 'compare',
              operator: 'gt',
              value: '2020',
            },
          },
        },
      },
      property: 'assignee',
    };

    const plan = planner.createPlan(withSpaceIdOptions(query));
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
    const query: QueryAST.Query = {
      type: 'select',
      filter: {
        type: 'text-search',
        typename: PERSON_TYPENAME,
        text: 'Bill',
      },
    };

    const plan = planner.createPlan(withSpaceIdOptions(query));
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
    const query: QueryAST.Query = {
      type: 'select',
      filter: {
        type: 'or',
        filters: [
          {
            type: 'object',
            typename: 'dxn:type:dxos.org/type/Organization:0.1.0',
            props: {},
          },
          {
            type: 'object',
            typename: 'dxn:type:dxos.org/type/Person:0.1.0',
            props: {},
          },
        ],
      },
    };

    const plan = planner.createPlan(withSpaceIdOptions(query));
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
    const query: QueryAST.Query = {
      type: 'select',
      filter: {
        type: 'not',
        filter: {
          type: 'or',
          filters: [
            {
              id: undefined,
              props: {},
              type: 'object',
              typename: 'dxn:type:dxos.org/type/Organization:0.1.0',
            },
            {
              id: undefined,
              props: {},
              type: 'object',
              typename: 'dxn:type:dxos.org/type/Person:0.1.0',
            },
          ],
        },
      },
    };

    const plan = planner.createPlan(withSpaceIdOptions(query));
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
    const query: QueryAST.Query = {
      options: {
        deleted: 'only',
      },
      query: {
        filter: {
          id: undefined,
          props: {},
          type: 'object',
          typename: 'dxn:type:dxos.org/type/Task:0.1.0',
        },
        type: 'select',
      },
      type: 'options',
    };

    const plan = planner.createPlan(withSpaceIdOptions(query));
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

const expectSteps = (plan: QueryPlan.Plan, expectedSteps: QueryPlan.Step['_tag'][]) => {
  expect(plan.steps.map((step) => step._tag)).toEqual(expectedSteps);
};
