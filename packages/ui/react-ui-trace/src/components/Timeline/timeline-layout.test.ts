//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Trace from '@dxos/compute/Trace';

import { buildExecutionGraph } from '../../execution-graph/execution-graph.ts';
import subAgentFixture from '../../execution-graph/testing/sub-agent-delegation.json';
import { type TimelineLayout, layoutTimeline } from './timeline-layout.ts';
import { type Commit } from './Timeline.tsx';

describe('layoutTimeline', () => {
  test('linear history keeps every commit in lane 0', ({ expect }) => {
    const commits: Commit[] = [
      { id: 'c1', branch: 'main', message: 'first' },
      { id: 'c2', branch: 'main', message: 'second', parents: ['c1'] },
      { id: 'c3', branch: 'main', message: 'third', parents: ['c2'] },
    ];
    expect(`\n${format(layoutTimeline(commits, ['main']))}\n`).toMatchInlineSnapshot(`
      "
      0: lane 0  first
      1: lane 0  second
      2: lane 0  third
      lanes (1): main -> 0
      spans: main: 0..2
      "
    `);
  });

  test('a fork takes its own lane and the merge closes its span', ({ expect }) => {
    const commits: Commit[] = [
      { id: 'b', branch: 'main', message: 'baseline' },
      { id: 'f0', branch: 'feature', message: 'start feature', parents: ['b'] },
      { id: 'f1', branch: 'feature', message: 'implement', parents: ['f0'] },
      { id: 'm', branch: 'main', message: 'merge feature', parents: ['f1', 'b'] },
    ];
    expect(`\n${format(layoutTimeline(commits, ['main', 'feature']))}\n`).toMatchInlineSnapshot(`
      "
      0: lane 0  baseline
      1: lane 1  start feature
      2: lane 1  implement
      3: lane 0  merge feature
      lanes (2): main -> 0, feature -> 1
      spans: main: 0..3, feature: 0..3
      "
    `);
  });

  test('a lane is reused once its branch has merged', ({ expect }) => {
    const commits: Commit[] = [
      { id: 'b', branch: 'main', message: 'baseline' },
      { id: 'x0', branch: 'first', message: 'first work', parents: ['b'] },
      { id: 'm0', branch: 'main', message: 'merge first', parents: ['x0', 'b'] },
      { id: 'y0', branch: 'second', message: 'second work', parents: ['m0'] },
      { id: 'm1', branch: 'main', message: 'merge second', parents: ['y0', 'm0'] },
    ];
    expect(`\n${format(layoutTimeline(commits, ['main', 'first', 'second']))}\n`).toMatchInlineSnapshot(`
      "
      0: lane 0  baseline
      1: lane 1  first work
      2: lane 0  merge first
      3: lane 1  second work
      4: lane 0  merge second
      lanes (2): main -> 0, first -> 1, second -> 1
      spans: main: 0..4, first: 0..2, second: 2..4
      "
    `);
  });

  test('two branches open at once take separate lanes', ({ expect }) => {
    const commits: Commit[] = [
      { id: 'b', branch: 'main', message: 'baseline' },
      { id: 'x0', branch: 'first', message: 'first work', parents: ['b'] },
      { id: 'y0', branch: 'second', message: 'second work', parents: ['b'] },
      { id: 'm0', branch: 'main', message: 'merge first', parents: ['x0', 'b'] },
      { id: 'm1', branch: 'main', message: 'merge second', parents: ['y0', 'm0'] },
    ];
    expect(`\n${format(layoutTimeline(commits, ['main', 'first', 'second']))}\n`).toMatchInlineSnapshot(`
      "
      0: lane 0  baseline
      1: lane 1  first work
      2: lane 2  second work
      3: lane 0  merge first
      4: lane 0  merge second
      lanes (3): main -> 0, first -> 1, second -> 2
      spans: main: 0..4, first: 0..3, second: 0..4
      "
    `);
  });

  test('a branch outside the whitelist gets no lane and no row', ({ expect }) => {
    const commits: Commit[] = [
      { id: 'b', branch: 'main', message: 'baseline' },
      { id: 'h0', branch: 'hidden', message: 'hidden work', parents: ['b'] },
      { id: 'c1', branch: 'main', message: 'more', parents: ['b'] },
    ];
    const layout = layoutTimeline(commits, ['main']);
    expect(`\n${format(layout)}\n`).toMatchInlineSnapshot(`
      "
      0: lane 0  baseline
      2: lane 0  more
      lanes (1): main -> 0
      spans: main: 0..2, hidden: 0..1
      "
    `);
    // The keyboard navigates in commit indices, so the hidden commit maps to no row.
    expect([...layout.rowByCommitIndex.entries()]).toEqual([
      [0, 0],
      [2, 1],
    ]);
  });

  test('a parent that is not in the list is ignored', ({ expect }) => {
    const commits: Commit[] = [
      { id: 'c1', branch: 'main', message: 'first', parents: ['pruned'] },
      { id: 'f0', branch: 'feature', message: 'fork', parents: ['c1', 'pruned'] },
    ];
    expect(`\n${format(layoutTimeline(commits, ['main', 'feature']))}\n`).toMatchInlineSnapshot(`
      "
      0: lane 0  first
      1: lane 1  fork
      lanes (2): main -> 0, feature -> 1
      spans: main: 0..1, feature: 0..1
      "
    `);
  });

  test('the sub-agent delegation fixture', ({ expect }) => {
    // External JSON → typed at this boundary; `buildExecutionGraph` reads only `meta`/`events`.
    const messages = (subAgentFixture as unknown as Trace.Message[])
      .slice()
      .sort((left, right) => (left.events[0]?.timestamp ?? 0) - (right.events[0]?.timestamp ?? 0));
    const { commits, branches } = buildExecutionGraph({ traceMessages: messages });
    const layout = layoutTimeline(commits, branches);

    expect(layout.rows).toHaveLength(commits.length);
    expect(`\n${layout.rows.map(({ commit }) => `lane ${layout.branchLane.get(commit.branch)}`).join('\n')}\n`)
      .toMatchInlineSnapshot(`
        "
        lane 0
        lane 1
        lane 1
        lane 1
        lane 1
        lane 1
        lane 1
        lane 2
        lane 2
        lane 2
        lane 2
        lane 2
        lane 2
        lane 2
        lane 2
        lane 2
        lane 2
        lane 0
        lane 1
        lane 0
        lane 0
        "
      `);
  });
});

/** One line per row (`lane message`), then the lanes and spans the pass assigned. */
const format = (layout: TimelineLayout): string => {
  const rows = layout.rows.map(({ commit, index }) => {
    const lane = layout.branchLane.get(commit.branch) ?? -1;
    return `${index}: lane ${lane}  ${commit.message}`;
  });
  const lanes = [...layout.branchLane.entries()].map(([branch, lane]) => `${branch} -> ${lane}`);
  const spans = [...layout.spans.entries()].map(([branch, span]) => `${branch}: ${span.start}..${span.end}`);
  return [...rows, `lanes (${layout.laneCount}): ${lanes.join(', ')}`, `spans: ${spans.join(', ')}`].join('\n');
};
