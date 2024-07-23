//
// Copyright 2024 DXOS.org
//

import { test } from 'vitest';

import { log } from '@dxos/log';

test('2 + 2', ({ expect }) => {
  expect(2 + 2).toBe(4);
});

test('console.log', () => {
  const logger = console.log.bind(console);
  logger('testing');
});

test('dxos/log', () => {
  log.info('testing');
});
