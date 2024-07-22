import { log } from '@dxos/log';
import { test } from 'vitest';

test('2 + 2', ({ expect }) => {
  expect(2 + 2).toBe(4);
});

test('dxos/log', () => {
  log.info('testing');
});
