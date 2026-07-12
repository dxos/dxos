//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Progress from './Progress';

describe('Progress', () => {
  test('seed registers pending tasks', () => {
    const progress = Progress.make();
    progress.seed([{ name: 'a', total: 3 }, { name: 'b' }]);
    const snapshot = progress.snapshot();
    expect(snapshot.tasks.map((task) => task.name)).toEqual(['a', 'b']);
    expect(snapshot.tasks.every((task) => task.status === 'pending')).toBe(true);
    expect(snapshot.tasks.find((task) => task.name === 'a')?.total).toBe(3);
  });

  test('task advances, records timing, sets total/estimate, and completes', () => {
    const progress = Progress.make();
    const handle = progress.task('a', { total: 3, label: 'A' });
    handle.advance();
    handle.advance();
    handle.total(4);
    handle.estimate(1_000);
    let task = progress.snapshot().tasks[0];
    expect(task.current).toBe(2);
    expect(task.total).toBe(4);
    expect(task.estimatedMs).toBe(1_000);
    expect(task.label).toBe('A');
    expect(task.status).toBe('running');
    expect(task.startedAt).toBeDefined();
    expect(task.elapsedMs).toBeGreaterThanOrEqual(0);

    handle.set(4);
    handle.done();
    task = progress.snapshot().tasks[0];
    expect(task.current).toBe(4);
    expect(task.status).toBe('done');
  });

  test('fail records the error and status', () => {
    const progress = Progress.make();
    progress.task('a').fail('boom');
    const task = progress.snapshot().tasks[0];
    expect(task.status).toBe('error');
    expect(task.error).toBe('boom');
  });

  test('remove drops the task from the registry', () => {
    const progress = Progress.make();
    const handle = progress.task('a');
    expect(progress.snapshot().tasks).toHaveLength(1);
    handle.remove();
    expect(progress.snapshot().tasks).toHaveLength(0);
  });

  test('subscribers are notified on change until unsubscribed', () => {
    const progress = Progress.make();
    let notifications = 0;
    const unsubscribe = progress.subscribe(() => notifications++);
    const handle = progress.task('a');
    handle.advance();
    const afterTwo = notifications;
    expect(afterTwo).toBeGreaterThanOrEqual(2);

    unsubscribe();
    handle.advance();
    expect(notifications).toBe(afterTwo);
  });

  describe('deriveEta', () => {
    test('returns the producer estimate when present', () => {
      const eta = Progress.deriveEta({
        name: 'a',
        current: 2,
        total: 10,
        status: 'running',
        updatedAt: new Date().toISOString(),
        elapsedMs: 4_000,
        estimatedMs: 500,
      });
      expect(eta).toBe(500);
    });

    test('falls back to a linear estimate from elapsed/current', () => {
      const eta = Progress.deriveEta({
        name: 'a',
        current: 2,
        total: 10,
        status: 'running',
        updatedAt: new Date().toISOString(),
        elapsedMs: 4_000,
      });
      // 4000ms / 2 done × 8 remaining = 16000ms.
      expect(eta).toBe(16_000);
    });

    test('returns undefined when total or progress is unknown', () => {
      const base = { name: 'a', current: 0, status: 'running' as const, updatedAt: new Date().toISOString() };
      expect(Progress.deriveEta(base)).toBeUndefined();
      expect(Progress.deriveEta({ ...base, total: 10 })).toBeUndefined();
      expect(Progress.deriveEta({ ...base, current: 3, elapsedMs: 100 })).toBeUndefined();
    });
  });
});
