//
// Copyright 2026 DXOS.org
//

import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { describe, expect, test } from 'vitest';

import { Filter, Query } from '@dxos/echo';

import { makeRegistry } from '../registry';
import { QueryResultCache, serializeQueryKey } from './query-result-cache';

describe('QueryResultCache', () => {
  test('returns the same instance for an identical query AST and constructs it once', () => {
    const cache = new QueryResultCache();
    const registry = makeRegistry();

    let factoryCalls = 0;
    const make = (query: Query.Any) => {
      factoryCalls++;
      return registry.query(query);
    };

    const first = cache.getOrCreate(Query.select(Filter.everything()), () => make(Query.select(Filter.everything())));
    const second = cache.getOrCreate(Query.select(Filter.everything()), () => make(Query.select(Filter.everything())));

    expect(first).toBe(second);
    expect(factoryCalls).toBe(1);
    expect(cache.size).toBe(1);
  });

  test('returns distinct instances for different query ASTs', () => {
    const cache = new QueryResultCache();
    const registry = makeRegistry();

    const everything = Query.select(Filter.everything());
    const nothing = Query.select(Filter.nothing());
    const first = cache.getOrCreate(everything, () => registry.query(everything));
    const second = cache.getOrCreate(nothing, () => registry.query(nothing));

    expect(first).not.toBe(second);
    expect(cache.size).toBe(2);
  });

  test('serializeQueryKey collapses equivalent queries and separates distinct ones', () => {
    expect(serializeQueryKey(Query.select(Filter.everything()))).toBe(
      serializeQueryKey(Query.select(Filter.everything())),
    );
    expect(serializeQueryKey(Query.select(Filter.everything()))).not.toBe(
      serializeQueryKey(Query.select(Filter.nothing())),
    );
  });

  // The cache is the mechanism that makes inline `query(...).atom` safe, so it must not become a
  // leak itself: entries are held weakly, so distinct queries whose results are no longer
  // referenced are collected and pruned rather than accumulating without bound.
  test('releases entries once their results are no longer referenced', { timeout: 20_000 }, async () => {
    setFlagsFromString('--expose_gc');
    const gc: () => void = runInNewContext('gc');

    const cache = new QueryResultCache();

    // Populate with many distinct queries; retain no reference to the results or their registries.
    for (let index = 0; index < 50; index++) {
      const query = Query.select(Filter.everything()).limit(index + 1);
      const registry = makeRegistry();
      cache.getOrCreate(query, () => registry.query(query));
    }
    expect(cache.size).toBeGreaterThan(0);

    await expect
      .poll(
        () => {
          gc();
          return cache.size;
        },
        { timeout: 20_000 },
      )
      .toBe(0);
  });
});
