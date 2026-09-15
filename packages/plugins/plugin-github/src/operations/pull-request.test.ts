//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { summarizeCheckRuns } from './pull-request.ts';

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

  test('a failure wins over pending runs', () => {
    const { ci, checks } = summarizeCheckRuns([
      { name: 'build', status: 'completed', conclusion: 'timed_out' },
      { name: 'test', status: 'queued' },
    ]);
    expect(ci).toEqual('failure');
    expect(checks).toEqual({ total: 2, passed: 0, failed: 1, pending: 1 });
  });
});
