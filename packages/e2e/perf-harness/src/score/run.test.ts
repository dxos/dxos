//
// Copyright 2026 DXOS.org
//

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, onTestFinished, test } from 'vitest';

import { groupOfScaledId, scoreStageRun } from './run.ts';
import { type Budget, MIN_SCORE } from './score.ts';
import { STAGE_WALL_GROUP, WORK_GROUP } from './stages.ts';

const BUSY = { scale: 'busy', prefix: 'busy', group: 'busy space', workGroup: 'busy work' };

type Row = { scale: string; wallMs: number; reactRenders?: number };

/** A workspace holding one batch of `flow` rows, one per scale and its boot wall time. */
const setup = (rows: ReadonlyArray<Row>) => {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), 'perf-run-'));
  onTestFinished(() => rmSync(workspaceRoot, { recursive: true, force: true }));
  const dir = path.join(workspaceRoot, 'test-results', 'perf');
  mkdirSync(dir, { recursive: true });
  const lines = rows.map((properties) =>
    JSON.stringify({ properties: { flow: 'chat', stage: 'boot', iteration: 0, ...properties } }),
  );
  writeFileSync(path.join(dir, 'chat-measure-0.events.ndjson'), lines.join('\n') + '\n');
  return { workspaceRoot, dir };
};

const budgets: Record<string, Budget> = {
  'wall > boot': { target: 100, limit: 200, unit: 'ms' },
  'busy > wall > boot': { target: 300, limit: 600, unit: 'ms' },
};

const score = (rows: ReadonlyArray<Row>, extraBudgets: Record<string, Budget> = {}) =>
  scoreStageRun({
    ...setup(rows),
    flow: 'chat',
    scale: 'blank',
    extraScales: [BUSY],
    suite: 'chat',
    title: 'Chat',
    budgets: { ...budgets, ...extraBudgets },
    budgetsFile: 'budgets.json',
  });

describe('scoreStageRun', () => {
  test('maps an extra scale prefix to its group and leaves other ids alone', ({ expect }) => {
    const groupOf = groupOfScaledId([BUSY]);
    expect(groupOf('busy > wall > boot')).toBe('busy space');
    expect(groupOf('busy > reactRenders > boot')).toBe('busy work');
    expect(groupOf('wall > boot')).toBe(STAGE_WALL_GROUP);
    expect(groupOf('reactRenders > boot')).toBe(WORK_GROUP);
  });

  test('scores budgeted work counters in their groups and drops the unbudgeted ones', ({ expect }) => {
    const report = score(
      [
        { scale: 'blank', wallMs: 100, reactRenders: 50 },
        { scale: 'busy', wallMs: 300, reactRenders: 70 },
      ],
      { 'busy > reactRenders > boot': { target: 70, limit: 75, unit: 'count' } },
    );
    expect(report.metrics.map(({ id, group }) => ({ id, group }))).toContainEqual({
      id: 'busy > reactRenders > boot',
      group: 'busy work',
    });
    expect(report.metrics.map(({ id }) => id)).not.toContain('reactRenders > boot');
    expect(report.unbudgeted).toEqual([]);
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

  test('rejects extra scales without a primary scale', ({ expect }) => {
    expect(() =>
      scoreStageRun({
        ...setup([{ scale: 'blank', wallMs: 100 }]),
        flow: 'chat',
        extraScales: [BUSY],
        suite: 'chat',
        title: 'Chat',
        budgets,
        budgetsFile: 'budgets.json',
      }),
    ).toThrow('scale is required when extraScales is set');
  });

  test('floors an extra scale that produced no rows', ({ expect }) => {
    const report = score([{ scale: 'blank', wallMs: 100 }]);
    const busy = report.groups.find(({ group }) => group === 'busy space');
    expect(busy?.score).toBeCloseTo(MIN_SCORE);
  });
});
