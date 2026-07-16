//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { describe, expect, test } from 'vitest';

import { Trace } from '@dxos/compute';

import { createProgressRegistry } from './progress-registry';
import {
  PROGRESS_STATUS_CANCELLED,
  PROGRESS_STATUS_COMPLETE,
  PROGRESS_STATUS_FAILED,
  createProgressTraceSink,
} from './progress-trace-sink';

const statusMessage = (data: Trace.PayloadType<typeof Trace.StatusUpdate>, meta: Trace.Meta = {}): Trace.Message =>
  ({
    meta,
    isEphemeral: true,
    events: [{ type: Trace.StatusUpdate.key, timestamp: Date.now(), data }],
  }) as unknown as Trace.Message;

describe('createProgressTraceSink', () => {
  test('registers a monitor and advances progress for status.update events', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress);
    const key = 'mailbox-uri#sync';

    sink.write(
      statusMessage({
        message: 'Inbox',
        progress: { key, current: 0, total: 10 },
      }),
    );
    sink.write(
      statusMessage({
        message: 'Inbox',
        progress: { key, current: 3 },
      }),
    );

    const task = registry.get(progress.monitorAtom(key));
    expect(task?.label).toBe('Inbox');
    expect(task?.current).toBe(3);
    expect(task?.total).toBe(10);
    expect(task?.status).toBe('running');
  });

  test('completes and removes the monitor on progress.complete', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress);
    const key = 'mailbox-uri#sync';

    sink.write(statusMessage({ message: 'Inbox', progress: { key, current: 0, total: 2 } }));
    sink.write(statusMessage({ message: PROGRESS_STATUS_COMPLETE, progress: { key } }));

    expect(registry.get(progress.monitorAtom(key))).toBeUndefined();
    expect(registry.get(progress.snapshotAtom).tasks).toHaveLength(0);
  });

  test('marks failed monitors visible and leaves them registered', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress);
    const key = 'mailbox-uri#sync';

    sink.write(statusMessage({ message: 'Inbox', progress: { key, current: 1, total: 5 } }));
    sink.write(statusMessage({ message: PROGRESS_STATUS_FAILED, progress: { key } }));

    const task = registry.get(progress.monitorAtom(key));
    expect(task?.status).toBe('error');
    expect(task?.error).toBe(PROGRESS_STATUS_FAILED);
    expect(task?.current).toBe(1);
  });

  test('notes and removes the monitor on Cancelled', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress);
    const key = 'mailbox-uri#sync';

    sink.write(statusMessage({ message: 'Inbox', progress: { key, current: 2, total: 5 } }));
    sink.write(statusMessage({ message: PROGRESS_STATUS_CANCELLED, progress: { key } }));

    expect(registry.get(progress.monitorAtom(key))).toBeUndefined();
  });

  test('ignores status updates without a progress key', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress);

    sink.write(statusMessage({ message: 'Thinking about the plan' }));

    expect(registry.get(progress.snapshotAtom).tasks).toHaveLength(0);
  });

  test('lazy registry getter drops events until the registry is available', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    let resolved: ReturnType<typeof createProgressRegistry> | undefined;
    const sink = createProgressTraceSink(() => resolved);
    const key = 'mailbox-uri#sync';

    sink.write(statusMessage({ message: 'Inbox', progress: { key, current: 1, total: 5 } }));
    expect(registry.get(progress.snapshotAtom).tasks).toHaveLength(0);

    resolved = progress;
    sink.write(statusMessage({ message: 'Inbox', progress: { key, current: 2, total: 5 } }));

    const task = registry.get(progress.monitorAtom(key));
    expect(task?.current).toBe(2);
    expect(task?.total).toBe(5);
  });

  test('registers a cancellable monitor and terminates the emitting process on cancel', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const terminated: string[] = [];
    const sink = createProgressTraceSink(progress, {
      terminateProcess: (pid) => terminated.push(pid),
    });
    const key = 'mailbox-uri#sync';
    const pid = 'process-abc';

    sink.write(
      statusMessage(
        {
          message: 'Inbox',
          progress: { key, current: 1, total: 5 },
        },
        { pid },
      ),
    );

    const task = registry.get(progress.monitorAtom(key));
    expect(task?.cancellable).toBe(true);

    progress.cancel(key);

    expect(terminated).toEqual([pid]);
    expect(registry.get(progress.monitorAtom(key))).toBeUndefined();
  });
});
