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
    expect(action).toEqual({ _tag: 'fix', pullRequests: [failing], attempts: new Map([[failing.url, 1]]) });
    expect(fixPrompt([failing])).toContain('build: https://ci/1');
  });

  test('b: a failure outranks approval', ({ expect }) => {
    const failing = pr({ approved: true, failed: [{ name: 'build' }] });
    expect(decide({ running: false, pullRequests: [failing], sent: none })._tag).toBe('fix');
  });

  test('c: approval with nothing failed sends the land follow-up', ({ expect }) => {
    const approved = pr({ approved: true });
    const action = decide({ running: false, pullRequests: [approved], sent: none });
    expect(action).toEqual({ _tag: 'land', pullRequests: [approved], attempts: new Map([[approved.url, 1]]) });
    expect(landPrompt([approved])).toContain('gh pr merge --auto --squash');
  });

  test('c: lands only the approved pull requests', ({ expect }) => {
    const approved = pr({ approved: true });
    const other = pr({ url: 'https://github.com/dxos/dxos/pull/2' });
    expect(decide({ running: false, pullRequests: [approved, other], sent: none })).toEqual({
      _tag: 'land',
      pullRequests: [approved],
      attempts: new Map([[approved.url, 1]]),
    });
  });

  test('d: otherwise nothing', ({ expect }) => {
    expect(decide({ running: false, pullRequests: [pr()], sent: none })).toEqual({ _tag: 'none' });
    expect(decide({ running: false, pullRequests: [], sent: none })).toEqual({ _tag: 'none' });
  });

  test('a new head commit re-arms the follow-up', ({ expect }) => {
    const before = pr({ failed: [{ name: 'build' }] });
    const after = pr({ commit: 'def', failed: [{ name: 'build' }] });
    expect(decide({ running: false, pullRequests: [after], sent: new Set([sentKey(before, 'fix')]) })._tag).toBe('fix');
  });

  test('re-prompts a fix when the turn ended without a push', ({ expect }) => {
    const failing = pr({ failed: [{ name: 'build' }] });
    const action = decide({ running: false, pullRequests: [failing], sent: new Set([sentKey(failing, 'fix')]) });
    expect(action).toMatchObject({ _tag: 'fix', pullRequests: [failing], attempts: new Map([[failing.url, 2]]) });
    expect(sentKey(failing, 'fix', 2)).toBe(`${failing.url}@abc#fix.2`);
    if (action._tag === 'fix') {
      const prompt = fixPrompt(action.pullRequests, action.attempts);
      expect(prompt).toContain('attempt 2 of 3');
      expect(prompt).toContain('still red');
      expect(prompt).toContain('concrete reason');
    }
    const third = decide({
      running: false,
      pullRequests: [failing],
      sent: new Set([sentKey(failing, 'fix'), sentKey(failing, 'fix', 2)]),
    });
    expect(third).toMatchObject({ _tag: 'fix', attempts: new Map([[failing.url, 3]]) });
  });

  test('stops after three fixes on one commit', ({ expect }) => {
    const failing = pr({ approved: true, failed: [{ name: 'build' }] });
    const sent = new Set([1, 2, 3].map((attempt) => sentKey(failing, 'fix', attempt)));
    expect(decide({ running: false, pullRequests: [failing], sent })).toEqual({ _tag: 'none' });
  });

  test('a new commit re-arms the attempts', ({ expect }) => {
    const before = pr({ failed: [{ name: 'build' }] });
    const after = pr({ commit: 'def', failed: [{ name: 'build' }] });
    const sent = new Set([1, 2, 3].map((attempt) => sentKey(before, 'fix', attempt)));
    expect(decide({ running: false, pullRequests: [after], sent })).toMatchObject({
      _tag: 'fix',
      attempts: new Map([[after.url, 1]]),
    });
  });

  test('land re-prompts at most three times per commit', ({ expect }) => {
    const approved = pr({ approved: true });
    const sent = new Set([sentKey(approved, 'land')]);
    expect(decide({ running: false, pullRequests: [approved], sent })).toMatchObject({
      _tag: 'land',
      attempts: new Map([[approved.url, 2]]),
    });
    sent.add(sentKey(approved, 'land', 2)).add(sentKey(approved, 'land', 3));
    expect(decide({ running: false, pullRequests: [approved], sent })).toEqual({ _tag: 'none' });
    expect(landPrompt([approved], new Map([[approved.url, 2]]))).toContain('attempt 2 of 3');
  });

  test('does not re-prompt while the turn runs', ({ expect }) => {
    const failing = pr({ failed: [{ name: 'build' }] });
    expect(decide({ running: true, pullRequests: [failing], sent: new Set([sentKey(failing, 'fix')]) })).toEqual({
      _tag: 'none',
    });
  });

  test('does not land while a failure stands, even with its fixes spent', ({ expect }) => {
    const failing = pr({ approved: true, failed: [{ name: 'build' }] });
    const sent = new Set([1, 2, 3].map((attempt) => sentKey(failing, 'fix', attempt)));
    expect(decide({ running: false, pullRequests: [failing], sent })).toEqual({
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

  test('a cancelled run is a superseded duplicate, not a failure', ({ expect }) => {
    const snapshot = toSnapshot('u', {
      ...status,
      runs: [
        { name: 'build', outcome: 'failure', conclusion: 'cancelled' },
        { name: 'test', outcome: 'failure', conclusion: 'failure' },
      ],
    });
    expect(snapshot.failed).toEqual([{ name: 'test' }]);
  });

  test('the Stale draft run gate is not the agent to fix', ({ expect }) => {
    const snapshot = toSnapshot('u', {
      ...status,
      runs: [{ name: 'Stale draft run', outcome: 'failure', conclusion: 'failure' }],
    });
    expect(snapshot.failed).toEqual([]);
  });

  test('an approving review or the land label is approval', ({ expect }) => {
    expect(toSnapshot('u', status).approved).toBe(false);
    expect(toSnapshot('u', { ...status, review: 'approved' }).approved).toBe(true);
    expect(toSnapshot('u', { ...status, labels: ['bug', 'Land'] }).approved).toBe(true);
    expect(toSnapshot('u', { ...status, review: 'changes_requested' }).approved).toBe(false);
  });
});
