//
// Copyright 2024 DXOS.org
//

import { test } from 'vitest';

import { log } from '@dxos/log';

import { executeQuery } from './query-executor';
import { createTestData } from '../testing';

test('run', async ({ expect }) => {
  const dataSource = createTestData();
  // for (const node of dataSource.nodes) {
  //   log.info('node', { id: node.id, label: node.label, name: node.properties.name });
  // }
  // for (const relationship of dataSource.relationships) {
  //   log.info('relationship', {
  //     source: relationship.source.id,
  //     target: relationship.target.id,
  //     label: relationship.label,
  //   });
  // }

  const result = await executeQuery(
    dataSource,
    `
      MATCH (org:Org {name: 'DXOS'})-[:ORG_EMPLOYEES]->(c:Contact)<-[:TASK_ASSIGNEE]-(t:Task)-[:TASK_PROJECT]->(p:Project {name: 'Composer'})
      RETURN c.name, t.name
    `,
  );

  expect(result).toEqual([
    { c_name: 'Rich', t_name: 'Create form builder' },
    {
      c_name: 'Josiah',
      t_name: 'Optimize startup performance',
    },
    { c_name: 'Rich', t_name: 'Implement dark mode' },
    {
      c_name: 'Josiah',
      t_name: 'Add support for custom themes',
    },
  ]);

  log.info('result', { result });
});
