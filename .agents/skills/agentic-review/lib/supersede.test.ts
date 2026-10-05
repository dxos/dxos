//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { type ResolutionEntry } from './resolution.ts';
import { applyStatuses, carryStatuses } from './supersede.ts';

const row = (id: string, status: ResolutionEntry['status'], ruleId: string, location: string): ResolutionEntry => ({
  id,
  status,
  ruleId,
  location,
});

describe('carryStatuses', () => {
  test('matches on rule and exact location', () => {
    const statuses = carryStatuses(
      [row('old-1', 'ignored', 'no-casts', 'a.ts:10:3'), row('old-2', 'ignored', 'no-casts', 'a.ts:20')],
      [row('new-1', 'unresolved', 'no-casts', 'a.ts:20'), row('new-2', 'unresolved', 'no-casts', 'a.ts:10:3')],
    );
    expect(Object.fromEntries(statuses)).toEqual({ 'new-1': 'ignored', 'new-2': 'ignored' });
  });

  test('falls back to rule and file only when the pair is unique on both sides', () => {
    expect(
      Object.fromEntries(
        carryStatuses(
          [row('old-1', 'ignored', 'no-casts', 'a.ts:10')],
          [row('new-1', 'unresolved', 'no-casts', 'a.ts:14')],
        ),
      ),
    ).toEqual({ 'new-1': 'ignored' });
    expect(
      carryStatuses(
        [row('old-1', 'ignored', 'no-casts', 'a.ts:10')],
        [row('new-1', 'unresolved', 'no-casts', 'a.ts:14'), row('new-2', 'unresolved', 'no-casts', 'a.ts:30')],
      ).size,
    ).toBe(0);
  });

  test('never carries unresolved, resolved, or a different rule', () => {
    const statuses = carryStatuses(
      [
        row('old-1', 'unresolved', 'no-casts', 'a.ts:10'),
        row('old-2', 'ignored', 'no-sleep', 'b.ts:5'),
        row('old-3', 'resolved', 'no-casts', 'c.ts:7'),
      ],
      [
        row('new-1', 'unresolved', 'no-casts', 'a.ts:10'),
        row('new-2', 'unresolved', 'no-casts', 'b.ts:5'),
        row('new-3', 'unresolved', 'no-casts', 'c.ts:7'),
      ],
    );
    expect(statuses.size).toBe(0);
  });
});

describe('applyStatuses', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'supersede-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('rewrites only index rows', () => {
    const path = join(dir, 'REVIEW.md');
    const issues = '- abc-1 - unresolved - no-casts - a.ts:10';
    writeFileSync(
      path,
      [
        '---',
        'commit: abc',
        '---',
        '',
        '## Index',
        '',
        '- abc-1 - unresolved - no-casts - a.ts:10',
        '- abc-2 - unresolved - no-casts - a.ts:20',
        '',
        '## Issues',
        '',
        issues,
        '',
      ].join('\n'),
    );
    applyStatuses(path, new Map([['abc-1', 'ignored']]));
    const text = readFileSync(path, 'utf8');
    expect(text).toContain('## Index\n\n- abc-1 - ignored - no-casts - a.ts:10\n- abc-2 - unresolved');
    expect(text).toContain(`## Issues\n\n${issues}\n`);
  });
});
