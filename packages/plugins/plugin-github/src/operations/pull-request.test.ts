//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { summarizeCheckRuns, toCheckRun } from './pull-request.ts';

describe('summarizeCheckRuns', () => {
  test('no runs is none', () => {
    expect(summarizeCheckRuns([])).toEqual({ ci: 'none', checks: { total: 0, passed: 0, failed: 0, pending: 0 } });
  });

  test('all completed without failure is success, skipped and neutral included', () => {
    const { ci, checks } = summarizeCheckRuns([
      { name: 'build', status: 'completed', conclusion: 'success' },
      { name: 'lint', status: 'completed', conclusion: 'skipped' },
      { name: 'docs', status: 'completed', conclusion: 'neutral' },
    ]);
    expect(ci).toEqual('success');
    expect(checks).toEqual({ total: 3, passed: 3, failed: 0, pending: 0 });
  });

  test('an unfinished run is pending', () => {
    const { ci } = summarizeCheckRuns([
      { name: 'build', status: 'completed', conclusion: 'success' },
      { name: 'test', status: 'in_progress', conclusion: null },
    ]);
    expect(ci).toEqual('pending');
  });

  test('a stale run does not count as passed', () => {
    const { ci, checks } = summarizeCheckRuns([
      { name: 'build', status: 'completed', conclusion: 'success' },
      { name: 'test', status: 'completed', conclusion: 'stale' },
    ]);
    expect(ci).toEqual('failure');
    expect(checks).toEqual({ total: 2, passed: 1, failed: 1, pending: 0 });
  });

  test('a failure wins over pending runs', () => {
    const { ci, checks } = summarizeCheckRuns([
      { name: 'build', status: 'completed', conclusion: 'timed_out' },
      { name: 'test', status: 'queued' },
    ]);
    expect(ci).toEqual('failure');
    expect(checks).toEqual({ total: 2, passed: 0, failed: 1, pending: 1 });
  });
});

describe('toCheckRun', () => {
  test('folds a conclusion into the outcome the list shows', () => {
    expect(toCheckRun({ name: 'test', status: 'completed', conclusion: 'timed_out' }).outcome).toEqual('failure');
    expect(toCheckRun({ name: 'cli', status: 'completed', conclusion: 'skipped' }).outcome).toEqual('skipped');
    expect(toCheckRun({ name: 'e2e', status: 'in_progress', conclusion: null }).outcome).toEqual('pending');
    expect(toCheckRun({ name: 'build', status: 'completed', conclusion: 'success' }).outcome).toEqual('success');
  });

  test("links the provider's page over GitHub's", () => {
    const run = toCheckRun({
      name: 'Check / check',
      status: 'completed',
      conclusion: 'success',
      html_url: 'https://github.com/dxos/dxos/runs/1',
      details_url: 'https://depot.dev/orgs/acme/workflows/abc?job=1',
      started_at: '2026-09-23T12:47:05Z',
      completed_at: '2026-09-23T12:51:13Z',
    });
    expect(run).toEqual({
      name: 'Check / check',
      outcome: 'success',
      conclusion: 'success',
      url: 'https://depot.dev/orgs/acme/workflows/abc?job=1',
      startedAt: '2026-09-23T12:47:05Z',
      completedAt: '2026-09-23T12:51:13Z',
    });
  });
});
