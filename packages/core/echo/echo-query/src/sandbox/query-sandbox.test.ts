import { expect, test } from 'vitest';
import { QuerySandbox } from './query-sandbox';
import { Query, Filter } from '@dxos/echo';

test('works', { timeout: 10_000 }, async ({ onTestFinished }) => {
  const sandbox = await new QuerySandbox().open();
  // onTestFinished(async () => void (await sandbox.close()));

  const ast = sandbox.eval(`
    Query.select(Filter.typename('dxos.org/type/Person'))
  `);
  console.log({ ast });
  expect(ast).toEqual(Query.select(Filter.typename('dxos.org/type/Person')).ast);
});

test('works with just Filter passed in');

test('Order');
