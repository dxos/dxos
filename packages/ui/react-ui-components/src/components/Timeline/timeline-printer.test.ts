//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type Commit } from './Timeline';
import { renderTimelineAscii } from './timeline-printer';

describe('renderTimelineAscii', () => {
  test('linear single branch', () => {
    const commits: Commit[] = [
      { id: 'c1', branch: 'main', message: 'first', parents: [] },
      { id: 'c2', branch: 'main', message: 'second', parents: ['c1'] },
      { id: 'c3', branch: 'main', message: 'third', parents: ['c2'] },
    ];
    expect(`\n${renderTimelineAscii(commits)}\n`).toMatchInlineSnapshot(`
      "
      ●  first
      ●  second
      ●  third
      "
    `);
  });

  test('fork from main, merge back', () => {
    const commits: Commit[] = [
      { id: 'b', branch: 'main', message: 'baseline on main', parents: [] },
      { id: 'f0', branch: 'feature', message: 'start feature', parents: ['b'] },
      { id: 'f1', branch: 'feature', message: 'implement', parents: ['f0'] },
      { id: 'f2', branch: 'feature', message: 'polish', parents: ['f1'] },
      {
        id: 'm',
        branch: 'main',
        message: 'merge feature into main',
        parents: ['f2', 'b'],
      },
    ];
    expect(`\n${renderTimelineAscii(commits)}\n`).toMatchInlineSnapshot(`
      "
      ●     baseline on main
      ├──●  start feature
      │  ●  implement
      │  ●  polish
      ◆──╯  merge feature into main
      "
    `);
  });

  test('two interleaved feature branches', () => {
    const commits: Commit[] = [
      { id: 'b', branch: 'main', message: 'baseline', parents: [] },
      { id: 'a1', branch: 'alpha', message: 'alpha start', parents: ['b'] },
      { id: 'b1', branch: 'beta', message: 'beta start', parents: ['b'] },
      { id: 'a2', branch: 'alpha', message: 'alpha work', parents: ['a1'] },
      { id: 'b2', branch: 'beta', message: 'beta work', parents: ['b1'] },
      { id: 'a3', branch: 'alpha', message: 'alpha done', parents: ['a2'] },
      { id: 'ma', branch: 'main', message: 'merge alpha', parents: ['a3', 'b'] },
      { id: 'b3', branch: 'beta', message: 'beta done', parents: ['b2'] },
      { id: 'mb', branch: 'main', message: 'merge beta', parents: ['b3', 'ma'] },
    ];
    expect(`\n${renderTimelineAscii(commits)}\n`).toMatchInlineSnapshot(`
      "
      ●        baseline
      ├──●     alpha start
      ├──┼──●  beta start
      │  ●  │  alpha work
      │  │  ●  beta work
      │  ●  │  alpha done
      ◆──╯  │  merge alpha
      │     ●  beta done
      ◆─────╯  merge beta
      "
    `);
  });
});
