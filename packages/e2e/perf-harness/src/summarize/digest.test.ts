//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { digestRows, functionIdentity, meanCosts, realmOf, topFunctions } from './digest.ts';
import { type FunctionCost } from './profile.ts';

const cost = (key: string, selfMs: number): FunctionCost => ({
  key,
  label: key,
  package: '',
  selfMs,
  totalMs: selfMs,
  callers: new Map(),
  callees: new Map(),
});

const costs = (...entries: FunctionCost[]) => new Map(entries.map((entry) => [entry.key, entry]));

describe('profile digest', () => {
  test('a realm drops the chunk hash so one worker matches across builds', ({ expect }) => {
    expect(realmOf('shared_worker_coordinator_worker_CBpUvEhJ_js')).toBe('shared_worker_coordinator_worker');
    expect(realmOf('page')).toBe('page');
  });

  test('a function missing from a profile counts as zero in the mean', ({ expect }) => {
    const mean = meanCosts([costs(cost('a', 10)), costs(cost('a', 20), cost('b', 6))]);
    expect(mean.get('a')?.selfMs).toBe(15);
    expect(mean.get('b')?.selfMs).toBe(3);
  });

  test('comparing ranks by the size of the change, not by cost', ({ expect }) => {
    const rows = digestRows(
      [
        {
          stage: 'boot',
          realm: 'page',
          base: costs(cost('big', 500), cost('moved', 10)),
          candidate: costs(cost('big', 505), cost('moved', 90)),
        },
      ],
      true,
      1,
    );
    expect(rows.map(({ key }) => key)).toEqual(['moved']);
  });

  test('a capture and a scenario name one function alike across builds', ({ expect }) => {
    expect(functionIdentity({ label: 'query index-abc123.js:10:4', source: 'packages/core/echo/src/query.ts' })).toBe(
      'query@query.ts',
    );
    expect(functionIdentity({ label: 'query index-def456.js:88:2', source: 'packages/core/echo/src/query.ts' })).toBe(
      'query@query.ts',
    );
    expect(functionIdentity({ label: 'tick worker.js:5:1' })).toBe('tick@worker.js');
  });

  test('the signature sums self time across stages and realms and skips native frames', ({ expect }) => {
    const labelled = (label: string, selfMs: number): FunctionCost => ({ ...cost(label, selfMs), label });
    const top = topFunctions(
      [
        {
          stage: 'reload',
          realm: 'page',
          base: new Map(),
          candidate: costs(labelled('render a.js:1:1', 30), labelled('(garbage collector)', 900)),
        },
        { stage: 'first-answer', realm: 'worker', base: new Map(), candidate: costs(labelled('render a.js:9:1', 40)) },
        { stage: 'first-answer', realm: 'page', base: new Map(), candidate: costs(labelled('paint b.js:2:2', 50)) },
      ],
      2,
    );
    expect(top).toEqual([
      { identity: 'render@a.js', selfMs: 70 },
      { identity: 'paint@b.js', selfMs: 50 },
    ]);
  });
});
