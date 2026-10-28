//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type NightlyReport, renderSummary } from './report.ts';

const report = (message: string): NightlyReport => ({
  ok: false,
  checks: [{ id: 'C1', name: 'runs end', ok: false, failures: [{ class: 'DEADLINE', message, pid: 'run-1' }] }],
  runs: { runs: 1, invocations: 1, succeeded: 0, yielded: 0, failed: 1, open: 0 },
  startedAt: '2026-10-26T03:17:00Z',
  finishedAt: '2026-10-26T04:02:00Z',
  spaceId: 'space',
  seeded: 100,
  trashed: 100,
  poolSize: 10_000,
});

describe('renderSummary', () => {
  test('keeps a multi-line failure message on one table row', ({ expect }) => {
    const summary = renderSummary(report('Error: deadline | exceeded\n    at run (handler.ts:21)\n'));
    const row = summary.split('\n').find((line) => line.startsWith('| C1 | DEADLINE |'));
    expect(row).toBe('| C1 | DEADLINE | run-1 | Error: deadline \\| exceeded at run (handler.ts:21) |');
  });

  test('caps a long failure message', ({ expect }) => {
    const summary = renderSummary(report('x'.repeat(1_000)));
    expect(summary).toContain(`| ${'x'.repeat(300)} |`);
    expect(summary).not.toContain('x'.repeat(301));
  });
});
