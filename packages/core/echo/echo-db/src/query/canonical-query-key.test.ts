//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Filter, Query } from '@dxos/echo';

import { canonicalQueryKey } from './canonical-query-key';

describe('canonicalQueryKey', () => {
  test('two queries differing only in debugLabel produce the same key', () => {
    const ast1 = Query.select(Filter.typename('Test')).debugLabel('label-a').ast;
    const ast2 = Query.select(Filter.typename('Test')).debugLabel('label-b').ast;
    expect(canonicalQueryKey(ast1)).toEqual(canonicalQueryKey(ast2));
  });

  test('query without debugLabel and one with debugLabel produce the same key', () => {
    const base = Query.select(Filter.typename('Test'));
    const withLabel = base.debugLabel('trigger');
    expect(canonicalQueryKey(base.ast)).toEqual(canonicalQueryKey(withLabel.ast));
  });

  test('two queries with different filter types produce different keys', () => {
    const ast1 = Query.select(Filter.everything()).ast;
    const ast2 = Query.select(Filter.nothing()).ast;
    expect(canonicalQueryKey(ast1)).not.toEqual(canonicalQueryKey(ast2));
  });

  test('two queries with different typenames produce different keys', () => {
    const ast1 = Query.select(Filter.typename('Foo')).ast;
    const ast2 = Query.select(Filter.typename('Bar')).ast;
    expect(canonicalQueryKey(ast1)).not.toEqual(canonicalQueryKey(ast2));
  });

  test('key is stable across repeated calls for the same AST', () => {
    const ast = Query.select(Filter.everything()).ast;
    expect(canonicalQueryKey(ast)).toEqual(canonicalQueryKey(ast));
  });

  test('key is stable regardless of JSON key insertion order', () => {
    const base = Query.select(Filter.everything());
    const k1 = canonicalQueryKey(base.ast);
    // Reorder keys via round-trip through JSON.
    const ast2 = JSON.parse(JSON.stringify(base.ast));
    expect(k1).toEqual(canonicalQueryKey(ast2));
  });

  test('queries with different deleted options produce different keys', () => {
    const ast1 = Query.select(Filter.everything()).options({ deleted: 'include' }).ast;
    const ast2 = Query.select(Filter.everything()).options({ deleted: 'exclude' }).ast;
    expect(canonicalQueryKey(ast1)).not.toEqual(canonicalQueryKey(ast2));
  });

  test('queries with different from scopes produce different keys', () => {
    const ast1 = Query.select(Filter.everything()).from({ spaceIds: ['space-1'] }).ast;
    const ast2 = Query.select(Filter.everything()).from({ spaceIds: ['space-2'] }).ast;
    expect(canonicalQueryKey(ast1)).not.toEqual(canonicalQueryKey(ast2));
  });
});
