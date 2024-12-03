//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { log } from '@dxos/log';

import { createExecutionPlan } from './execution-plan';
import { parseCypherQuery } from './parser';

describe('Execution Plan', () => {
  test('trivial', ({ expect }) => {
    const plan = createExecutionPlan(parseCypherQuery('MATCH (n:Person) RETURN n'));
    log.info('', { plan });
    expect(plan.steps.map((step) => step.type)).toEqual(['NodeScan', 'ProduceResults']);
  });

  test.only('complex query', ({ expect }) => {
    const plan = createExecutionPlan(
      parseCypherQuery(
        "MATCH (org:Org {name: 'DXOS'})-[:ORG_EMPLOYEES]->(c:Contact)<-[:TASK_ASSIGNEE]-(:Task)-[:TASK_PROJECT]->(p:Project {name: 'Composer'}) RETURN c.name",
      ),
    );
    log.info('', { plan });
    for (const step of plan.steps) {
      log.info('', { step });
    }
    expect(plan.steps.map((step) => step.type)).toEqual([
      'NodeScan',
      'FilterByProperty',
      'RelationshipScan',
      'FilterByLabel',
      'RelationshipScan',
      'FilterByLabel',
      'RelationshipScan',
      'FilterByLabel',
      'FilterByProperty',
      'ProduceResults',
    ]);
  });
});
