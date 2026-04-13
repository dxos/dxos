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
      Query.select(Filter.typename('org.dxos.type.person'))
    `);
    expect(ast).toEqual(Query.select(Filter.typename('org.dxos.type.person')).ast);
  });

  test('works with just Filter passed in', () => {
    const ast = sandbox.eval(trim`
      Filter.typename('org.dxos.type.person')
    `);
    expect(ast).toEqual(Query.select(Filter.typename('org.dxos.type.person')).ast);
  });

  test('Order', () => {
    const ast = sandbox.eval(trim`
      Query.type('org.dxos.type.person').orderBy(Order.property('name', 'desc'))
    `);
    expect(ast).toEqual(Query.type('org.dxos.type.person').orderBy(Order.property('name', 'desc')).ast);
  });

  test('traversal', () => {
    const ast = sandbox.eval(trim`
      Query.select(Filter.type('org.dxos.type.person', { jobTitle: 'investor' }))
        .reference('organization')
        .targetOf('org.dxos.relation.hasSubject')
        .source()
    `);

    expect(ast).toEqual(
      Query.select(Filter.type('org.dxos.type.person', { jobTitle: 'investor' }))
        .reference('organization')
        .targetOf('org.dxos.relation.hasSubject')
        .source().ast,
    );
  });
});
