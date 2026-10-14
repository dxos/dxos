//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { QueryBuilder } from '@dxos/echo-query';
import { PullRequest, Task } from '@dxos/types';

import { type PullRequestChecks, type PullRequestRow, filterRows, groupRows, relevance, sortRows } from './arrange.ts';
import { formatRelative } from './format.ts';

const make = (
  number: number,
  props: Partial<Pick<PullRequest.PullRequest, 'state' | 'repo' | 'author' | 'title' | 'updatedAt' | 'createdAt'>> = {},
): PullRequest.PullRequest =>
  PullRequest.make({ owner: 'dxos', repo: 'dxos', number, title: `Change ${number}`, state: 'open', ...props });

const checks = (ci: PullRequestChecks['ci'], review: PullRequestChecks['review'] = 'none'): PullRequestChecks => ({
  ci,
  review,
  approvals: review === 'approved' ? 1 : 0,
  checks: { total: 1, passed: ci === 'success' ? 1 : 0, failed: ci === 'failure' ? 1 : 0, pending: 0 },
});

const row = (pullRequest: PullRequest.PullRequest, extra: Partial<Omit<PullRequestRow, 'pullRequest'>> = {}) => ({
  pullRequest,
  tasks: [],
  ...extra,
});

const numbers = (rows: readonly PullRequestRow[]) => rows.map(({ pullRequest }) => pullRequest.number);

describe('relevance', () => {
  test('an open pull request with something to fix outranks one ready to merge, then one waiting', ({ expect }) => {
    const failing = row(make(1), { checks: checks('failure') });
    const ready = row(make(2), { checks: checks('success', 'approved') });
    const waiting = row(make(3), { checks: checks('success') });
    const merged = row(make(4, { state: 'merged' }));
    expect(relevance(failing)).toBeGreaterThan(relevance(ready));
    expect(relevance(ready)).toBeGreaterThan(relevance(waiting));
    expect(relevance(waiting)).toBeGreaterThan(relevance(merged));
  });

  test('a pull request a task tracks is nudged above an otherwise equal one', ({ expect }) => {
    const task = Task.make({ title: 'Ship it' });
    expect(relevance(row(make(1), { tasks: [task] }))).toBeGreaterThan(relevance(row(make(2))));
  });
});

describe('sortRows', () => {
  test('relevance descending puts the most urgent first and breaks ties by recency', ({ expect }) => {
    const rows = [
      row(make(1, { state: 'closed' })),
      row(make(2, { updatedAt: '2026-09-01T00:00:00Z' })),
      row(make(3, { updatedAt: '2026-10-01T00:00:00Z' })),
      row(make(4), { checks: checks('failure') }),
    ];
    expect(numbers(sortRows(rows, { field: 'relevance', direction: 'desc' }))).toEqual([4, 3, 2, 1]);
  });

  test('updated falls back to when it was opened', ({ expect }) => {
    const rows = [
      row(make(1, { updatedAt: '2026-01-01T00:00:00Z' })),
      row(make(2, { createdAt: '2026-06-01T00:00:00Z' })),
    ];
    expect(numbers(sortRows(rows, { field: 'updated', direction: 'desc' }))).toEqual([2, 1]);
  });
});

describe('groupRows', () => {
  test('none leaves the list ungrouped', ({ expect }) => {
    expect(groupRows([row(make(1))], 'none')).toBeUndefined();
  });

  test('state groups come in lifecycle order and keep the sort within each', ({ expect }) => {
    const rows = [row(make(1, { state: 'merged' })), row(make(3)), row(make(2))];
    const groups = groupRows(rows, 'state') ?? [];
    expect(groups.map((group) => group.id)).toEqual(['state-open', 'state-merged']);
    expect(numbers(groups[0].rows)).toEqual([3, 2]);
  });

  test('checks put failures first and rows without checks last', ({ expect }) => {
    const rows = [
      row(make(1)),
      row(make(2), { checks: checks('success') }),
      row(make(3), { checks: checks('failure') }),
    ];
    expect((groupRows(rows, 'checks') ?? []).map((group) => group.id)).toEqual([
      'checks-failure',
      'checks-success',
      'checks-unknown',
    ]);
  });

  test('repositories are grouped by owner and name', ({ expect }) => {
    const rows = [row(make(1, { repo: 'edge' })), row(make(2)), row(make(3, { repo: 'edge' }))];
    const groups = groupRows(rows, 'repo') ?? [];
    expect(groups.map((group) => [group.label, numbers(group.rows)])).toEqual([
      ['dxos/dxos', [2]],
      ['dxos/edge', [1, 3]],
    ]);
  });
});

describe('filterRows', () => {
  test('free text searches the title, reference and author', ({ expect }) => {
    const rows = [row(make(1, { title: 'Fix sync' })), row(make(2, { author: 'burdon' })), row(make(3))];
    const build = (text: string) => new QueryBuilder().build(text).filter;
    expect(numbers(filterRows(rows, build('sync')))).toEqual([1]);
    expect(numbers(filterRows(rows, build('burdon')))).toEqual([2]);
    expect(numbers(filterRows(rows, undefined))).toEqual([1, 2, 3]);
  });
});

describe('formatRelative', () => {
  test('uses the largest unit that fits', ({ expect }) => {
    const now = Date.parse('2026-10-07T12:00:00Z');
    expect(formatRelative('2026-10-07T09:00:00Z', now)).toMatch(/3 hours ago/);
    expect(formatRelative('not a date', now)).toEqual('');
  });
});
