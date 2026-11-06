//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildChangelogGraph } from '../ChangelogGraph/index.ts';
import { threadsOf } from './thread-rail.ts';

const decision = (id: string, title: string, extra = '') =>
  `\`\`\`mdl\ndecision ${id}: ${title}\n  date: 2026-10-0${id.slice(2)}\n  by: user:alice\n${extra}\`\`\`\n`;

const SPEC = [
  '# Spec\n\n## Changelog\n',
  decision('D-1', 'The canvas grows to fit its content.'),
  decision('D-2', 'Bounds are derived from content. Fills in [D-1].'),
  decision('D-3', 'Bounds grow to the major grid. Fills in [D-1].'),
  decision('D-4', 'Bounds grow to the minor grid while dragging.', '  supersedes: D-3\n'),
  decision('D-5', 'Shapes snap to the grid.'),
].join('\n');

const graph = buildChangelogGraph(SPEC);

describe('thread rail', () => {
  test('groups linked decisions, newest thread first and newest decision first', ({ expect }) => {
    const threads = threadsOf(graph, { superseded: true });
    expect(threads.map(({ rows }) => rows.map(({ decision }) => decision.id))).toEqual([
      ['D-5'],
      ['D-4', 'D-3', 'D-2', 'D-1'],
    ]);
  });

  test('hides superseded decisions unless asked, and counts them', ({ expect }) => {
    const [, thread] = threadsOf(graph);
    expect(thread.rows.map(({ decision }) => decision.id)).toEqual(['D-4', 'D-2', 'D-1']);
    expect(thread.superseded).toBe(1);
  });

  test('lays a branch on its own lane and joins it where it meets', ({ expect }) => {
    const [, thread] = threadsOf(graph, { superseded: true });
    expect(thread.lanes).toBe(2);
    expect(
      thread.rows.map(({ decision, lane, through, incoming, outgoing }) => [
        decision.id,
        lane,
        through,
        incoming,
        outgoing,
      ]),
    ).toEqual([
      ['D-4', 0, [], [], [0]],
      ['D-3', 0, [], [0], [0]],
      ['D-2', 1, [0], [], [1]],
      ['D-1', 0, [], [0, 1], []],
    ]);
  });
});
