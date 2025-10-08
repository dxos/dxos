import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import { QuerySandbox } from './query-sandbox';
import { Query, Filter, Order } from '@dxos/echo';

describe('QuerySandbox', () => {
  const sandbox = new QuerySandbox();
  beforeAll(() => sandbox.open());
  afterAll(() => sandbox.close());

  test('works', { timeout: 10_000 }, async () => {
    const ast = sandbox.eval(`
      Query.select(Filter.typename('dxos.org/type/Person'))
    `);
    expect(ast).toEqual(Query.select(Filter.typename('dxos.org/type/Person')).ast);
  });

  test('works with just Filter passed in', () => {
    const ast = sandbox.eval(`
      Filter.typename('dxos.org/type/Person')
    `);
    expect(ast).toEqual(Query.select(Filter.typename('dxos.org/type/Person')).ast);
  });

  test('Order', () => {
    const ast = sandbox.eval(`
      Query.type('dxos.org/type/Person').orderBy(Order.property('name', 'desc'))
    `);
    expect(ast).toEqual(Query.type('dxos.org/type/Person').orderBy(Order.property('name', 'desc')).ast);
  });

  test('traversal', () => {
    const ast = sandbox.eval(`
      Query.select(Filter.type('example.com/type/Person', { jobTitle: 'investor' }))
        .reference('organization')
        .targetOf('example.com/relation/ResearchOn')
        .source()
    `);

    expect(ast).toEqual(
      Query.select(Filter.type('example.com/type/Person', { jobTitle: 'investor' }))
        .reference('organization')
        .targetOf('example.com/relation/ResearchOn')
        .source().ast,
    );
  });
});
