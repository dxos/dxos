//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type PullRequestSnapshot, decide, fixPrompt, landPrompt, sentKey, toSnapshot } from './drive-decision.ts';

const pr = (overrides: Partial<PullRequestSnapshot> = {}): PullRequestSnapshot => ({
  url: 'https://github.com/dxos/dxos/pull/1',
  state: 'open',
  commit: 'abc',
  failed: [],
  approved: false,
  ...overrides,
});

const none = new Set<string>();

describe('decide', () => {
  test('waits while the turn runs', ({ expect }) => {
    expect(decide({ running: true, pullRequests: [pr({ approved: true })], sent: none })).toEqual({ _tag: 'none' });
  });

  test('a: every pull request merged', ({ expect }) => {
    expect(
      decide({ running: false, pullRequests: [pr({ state: 'merged' }), pr({ state: 'merged' })], sent: none }),
    ).toEqual({ _tag: 'merged' });
  });

  test('b: a failed check sends a fix naming it', ({ expect }) => {
    const failing = pr({ failed: [{ name: 'build', url: 'https://ci/1' }] });
    const action = decide({ running: false, pullRequests: [failing, pr({ url: 'x' })], sent: none });
    expect(action).toEqual({ _tag: 'fix', pullRequests: [failing] });
    expect(fixPrompt([failing])).toContain('build: https://ci/1');
  });

  test('b: a failure outranks approval', ({ expect }) => {
    const failing = pr({ approved: true, failed: [{ name: 'build' }] });
    expect(decide({ running: false, pullRequests: [failing], sent: none })._tag).toBe('fix');
  });

  test('c: approval with nothing failed sends the land follow-up', ({ expect }) => {
    const approved = pr({ approved: true });
    const action = decide({ running: false, pullRequests: [approved], sent: none });
    expect(action).toEqual({ _tag: 'land', pullRequests: [approved] });
    expect(landPrompt([approved])).toContain('gh pr merge --auto --squash');
  });

  test('c: lands only the approved pull requests', ({ expect }) => {
    const approved = pr({ approved: true });
    const other = pr({ url: 'https://github.com/dxos/dxos/pull/2' });
    expect(decide({ running: false, pullRequests: [approved, other], sent: none })).toEqual({
      _tag: 'land',
      pullRequests: [approved],
    });
  });

  test('d: otherwise nothing', ({ expect }) => {
    expect(decide({ running: false, pullRequests: [pr()], sent: none })).toEqual({ _tag: 'none' });
    expect(decide({ running: false, pullRequests: [], sent: none })).toEqual({ _tag: 'none' });
  });

  test('never repeats a follow-up for the same pull request, commit and action', ({ expect }) => {
    const failing = pr({ failed: [{ name: 'build' }] });
    expect(decide({ running: false, pullRequests: [failing], sent: new Set([sentKey(failing, 'fix')]) })).toEqual({
      _tag: 'none',
    });
    const approved = pr({ approved: true });
    expect(decide({ running: false, pullRequests: [approved], sent: new Set([sentKey(approved, 'land')]) })).toEqual({
      _tag: 'none',
    });
  });

  test('a new head commit re-arms the follow-up', ({ expect }) => {
    const before = pr({ failed: [{ name: 'build' }] });
    const after = pr({ commit: 'def', failed: [{ name: 'build' }] });
    expect(decide({ running: false, pullRequests: [after], sent: new Set([sentKey(before, 'fix')]) })._tag).toBe('fix');
  });

  test('does not land while a reported failure awaits its fix', ({ expect }) => {
    const failing = pr({ approved: true, failed: [{ name: 'build' }] });
    expect(decide({ running: false, pullRequests: [failing], sent: new Set([sentKey(failing, 'fix')]) })).toEqual({
      _tag: 'none',
    });
  });
});

describe('toSnapshot', () => {
  const status = { state: 'open' as const, commit: 'abc', runs: [], review: 'none', labels: [] };

  test('the Agentic Review check never counts as failed', ({ expect }) => {
    const snapshot = toSnapshot('u', {
      ...status,
      runs: [
        { name: 'Agentic Review', outcome: 'failure' },
        { name: 'build', outcome: 'failure', url: 'https://ci/2' },
        { name: 'lint', outcome: 'success' },
      ],
    });
    expect(snapshot.failed).toEqual([{ name: 'build', url: 'https://ci/2' }]);
  });

  test('an approving review or the land label is approval', ({ expect }) => {
    expect(toSnapshot('u', status).approved).toBe(false);
    expect(toSnapshot('u', { ...status, review: 'approved' }).approved).toBe(true);
    expect(toSnapshot('u', { ...status, labels: ['bug', 'Land'] }).approved).toBe(true);
    expect(toSnapshot('u', { ...status, review: 'changes_requested' }).approved).toBe(false);
  });
});
