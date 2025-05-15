//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { log } from '@dxos/log';

import { createExecutionPlan } from './execution-plan';
import { parseCypherQuery } from './parser';

// log.config({ filter: 'debug' });

describe('Execution Plan', () => {
  test('trivial', ({ expect }) => {
    const plan = createExecutionPlan(parseCypherQuery('MATCH (n:Person) RETURN n'));
    log('', { plan });
    expect(plan.steps.map((step) => step.type)).toEqual(['NodeScan', 'ProduceResults']);
  });

  test('complex query', ({ expect }) => {
    const plan = createExecutionPlan(
      parseCypherQuery(
        "MATCH (org:Organization {name: 'DXOS'})-[:ORG_EMPLOYEES]->(c:Contact)<-[:TASK_ASSIGNEE]-(:Task)-[:TASK_PROJECT]->(p:Project {name: 'Composer'}) RETURN c.name",
      ),
    );
    log('', { plan });
    for (const step of plan.steps) {
      log('step', { step });
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
