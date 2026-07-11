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

  test('task advances the item index, records timing, and completes', () => {
    const progress = Progress.make();
    const handle = progress.task('a', { total: 3, label: 'A' });
    handle.advance();
    handle.advance();
    let task = progress.snapshot().tasks[0];
    expect(task.current).toBe(2);
    expect(task.status).toBe('running');
    expect(task.startedAt).toBeDefined();
    expect(task.elapsedMs).toBeGreaterThanOrEqual(0);

    handle.set(3);
    handle.done();
    task = progress.snapshot().tasks[0];
    expect(task.current).toBe(3);
    expect(task.status).toBe('done');
  });

  test('fail records the error and status', () => {
    const progress = Progress.make();
    progress.task('a').fail('boom');
    const task = progress.snapshot().tasks[0];
    expect(task.status).toBe('error');
    expect(task.error).toBe('boom');
  });

  test('subscribers are notified on change until unsubscribed', () => {
    const progress = Progress.make();
    let notifications = 0;
    const unsubscribe = progress.subscribe(() => notifications++);
    const handle = progress.task('a'); // registers → notify
    handle.advance(); // → notify
    const afterTwo = notifications;
    expect(afterTwo).toBeGreaterThanOrEqual(2);

    unsubscribe();
    handle.advance(); // no further notifications
    expect(notifications).toBe(afterTwo);
  });
});
