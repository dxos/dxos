//
// Copyright 2025 DXOS.org
//

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { Filter, Order, Query } from '@dxos/echo';
import { trim } from '@dxos/util';

import { QuerySandbox } from './query-sandbox';

describe('QuerySandbox', () => {
  const sandbox = new QuerySandbox();
  beforeAll(() => sandbox.open());
  afterAll(() => sandbox.close());

  test('works', { timeout: 10_000 }, async () => {
    const ast = sandbox.eval(trim`
      Query.select(Filter.typename('dxos.org/type/Person'))
    `);
    expect(ast).toEqual(Query.select(Filter.typename('dxos.org/type/Person')).ast);
  });

  test('works with just Filter passed in', () => {
    const ast = sandbox.eval(trim`
      Filter.typename('dxos.org/type/Person')
    `);
    expect(ast).toEqual(Query.select(Filter.typename('dxos.org/type/Person')).ast);
  });

  test('Order', () => {
    const ast = sandbox.eval(trim`
      Query.type('dxos.org/type/Person').orderBy(Order.property('name', 'desc'))
    `);
    expect(ast).toEqual(Query.type('dxos.org/type/Person').orderBy(Order.property('name', 'desc')).ast);
  });

  test('traversal', () => {
    const ast = sandbox.eval(trim`
      Query.select(Filter.type('dxos.org/type/Person', { jobTitle: 'investor' }))
        .reference('organization')
        .targetOf('dxos.org/relation/HasSubject')
        .source()
    `);

    expect(ast).toEqual(
      Query.select(Filter.type('dxos.org/type/Person', { jobTitle: 'investor' }))
        .reference('organization')
        .targetOf('dxos.org/relation/HasSubject')
        .source().ast,
    );
  });
});
