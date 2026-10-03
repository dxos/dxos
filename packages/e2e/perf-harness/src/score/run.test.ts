//
// Copyright 2026 DXOS.org
//

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, onTestFinished, test } from 'vitest';

import { groupOfScaledId, scoreStageRun } from './run.ts';
import { type Budget, MIN_SCORE } from './score.ts';
import { STAGE_WALL_GROUP } from './stages.ts';

const BUSY = { scale: 'busy', prefix: 'busy', group: 'busy space' };

/** A workspace holding one batch of `flow` rows, one per scale and its boot wall time. */
const setup = (rows: ReadonlyArray<{ scale: string; wallMs: number }>) => {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), 'perf-run-'));
  onTestFinished(() => rmSync(workspaceRoot, { recursive: true, force: true }));
  const dir = path.join(workspaceRoot, 'test-results', 'perf');
  mkdirSync(dir, { recursive: true });
  const lines = rows.map(({ scale, wallMs }) =>
    JSON.stringify({ properties: { flow: 'chat', scale, stage: 'boot', iteration: 0, wallMs } }),
  );
  writeFileSync(path.join(dir, 'chat-measure-0.events.ndjson'), lines.join('\n') + '\n');
  return { workspaceRoot, dir };
};

const budgets: Record<string, Budget> = {
  'wall > boot': { target: 100, limit: 200, unit: 'ms' },
  'busy > wall > boot': { target: 300, limit: 600, unit: 'ms' },
};

const score = (rows: ReadonlyArray<{ scale: string; wallMs: number }>) =>
  scoreStageRun({
    ...setup(rows),
    flow: 'chat',
    scale: 'blank',
    extraScales: [BUSY],
    suite: 'chat',
    title: 'Chat',
    budgets,
    budgetsFile: 'budgets.json',
  });

describe('scoreStageRun', () => {
  test('maps an extra scale prefix to its group and leaves other ids alone', ({ expect }) => {
    const groupOf = groupOfScaledId([BUSY]);
    expect(groupOf('busy > wall > boot')).toBe('busy space');
    expect(groupOf('wall > boot')).toBe(STAGE_WALL_GROUP);
  });

  test('scores an extra scale under its prefix and group in the same report', ({ expect }) => {
    const report = score([
      { scale: 'blank', wallMs: 100 },
      { scale: 'busy', wallMs: 300 },
    ]);
    expect(report.metrics.map(({ id, group, value }) => ({ id, group, value }))).toEqual([
      { id: 'wall > boot', group: STAGE_WALL_GROUP, value: 100 },
      { id: 'busy > wall > boot', group: 'busy space', value: 300 },
    ]);
    expect(report.groups.map(({ group }) => group).sort()).toEqual(['busy space', STAGE_WALL_GROUP].sort());
  });

  test('floors an extra scale that produced no rows', ({ expect }) => {
    const report = score([{ scale: 'blank', wallMs: 100 }]);
    const busy = report.groups.find(({ group }) => group === 'busy space');
    expect(busy?.score).toBeCloseTo(MIN_SCORE);
  });
});
