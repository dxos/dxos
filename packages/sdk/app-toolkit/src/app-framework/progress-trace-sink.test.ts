//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { describe, expect, test } from 'vitest';

import { Trace } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';

import { createProgressRegistry } from './progress-registry';
import {
  PROGRESS_STATUS_CANCELLED,
  PROGRESS_STATUS_COMPLETE,
  PROGRESS_STATUS_FAILED,
  createProgressTraceSink,
  resolveTriggerId,
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

  test('registers a cancellable monitor and cancels the emitting process on cancel', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const cancelled: Array<{ pid?: string; space?: string; runtimeName?: string }> = [];
    const sink = createProgressTraceSink(progress, {
      cancelProcess: (entry) => cancelled.push({ pid: entry.pid, space: entry.space, runtimeName: entry.runtimeName }),
    });
    const key = 'mailbox-uri#sync';
    const pid = 'process-abc';

    sink.write(statusMessage({ message: 'Inbox', progress: { key, current: 1, total: 5 } }, { pid }));

    const task = registry.get(progress.monitorAtom(key));
    expect(task?.cancellable).toBe(true);

    progress.cancel(key);

    expect(cancelled).toEqual([{ pid, space: undefined, runtimeName: undefined }]);
    expect(registry.get(progress.monitorAtom(key))).toBeUndefined();
  });

  test('captures edge routing metadata (space, runtimeName, trigger) for cancel', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const cancelled: Array<{ pid?: string; space?: string; runtimeName?: string; trigger?: unknown }> = [];
    const sink = createProgressTraceSink(progress, {
      cancelProcess: (entry) => cancelled.push(entry),
    });
    const key = 'mailbox-uri#sync';
    const pid = 'edge-pid';
    const space = 'SPACE1';
    const trigger = Ref.fromURI(EID.make({ entityId: 'TRIGGER1' }));

    sink.write(
      statusMessage(
        { message: 'Inbox', progress: { key, current: 1, total: 5 } },
        { pid, space, trigger, runtimeName: Trace.CommonRuntimeName.edgeIntrinsic },
      ),
    );

    const task = registry.get(progress.monitorAtom(key));
    expect(task?.cancellable).toBe(true);

    progress.cancel(key);

    expect(cancelled).toHaveLength(1);
    expect(cancelled[0]?.pid).toBe(pid);
    expect(cancelled[0]?.space).toBe(space);
    expect(cancelled[0]?.runtimeName).toBe(Trace.CommonRuntimeName.edgeIntrinsic);
    expect(cancelled[0]?.trigger).toBe(trigger);
  });
});

describe('cancel tombstone (pid scope, default)', () => {
  // After a cancel, the dying run's tail keeps broadcasting for a moment (edge abort is not
  // instantaneous) — those events must not resurrect the meter. A genuinely new run (new pid) must
  // still register, so a failed cancel stays visible.
  test('events from the cancelled pid do not resurrect the monitor; a new run does', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress, { cancelProcess: () => {} });
    const key = 'mailbox-uri#sync';

    sink.write(statusMessage({ message: 'Inbox', progress: { key, current: 1, total: 5 } }, { pid: 'run-1' }));
    progress.cancel(key);
    expect(registry.get(progress.monitorAtom(key))).toBeUndefined();

    // Tail of the cancelled run.
    sink.write(statusMessage({ message: 'Inbox', progress: { key, current: 2, total: 5 } }, { pid: 'run-1' }));
    expect(registry.get(progress.monitorAtom(key))).toBeUndefined();

    // Fresh run — new pid — registers normally.
    sink.write(statusMessage({ message: 'Inbox', progress: { key, current: 0, total: 5 } }, { pid: 'run-2' }));
    const task = registry.get(progress.monitorAtom(key));
    expect(task?.current).toBe(0);
    expect(task?.status).toBe('running');
  });
});

describe('cancel tombstone (run scope)', () => {
  // An edge run is a chain of bounded invocations, each with a fresh pid. A pid tombstone would only
  // mask the link in-flight at cancel; the next link (new pid) would resurrect the meter. `run` scope
  // suppresses the key until the run's terminal status, so the whole chain's tail stays hidden and a
  // later run re-shows — matching the local, single-pid cancel behaviour.
  test('suppresses the whole cancelled chain (any pid) until a terminal status; a later run re-shows', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress, { cancelProcess: () => {}, cancelScope: 'run' });
    const key = 'mailbox-uri#sync';

    sink.write(statusMessage({ message: 'Inbox', progress: { key, current: 1, total: 5 } }, { pid: 'link-1' }));
    progress.cancel(key);
    expect(registry.get(progress.monitorAtom(key))).toBeUndefined();

    // Tail of the in-flight link — same pid — stays suppressed.
    sink.write(statusMessage({ message: 'Inbox', progress: { key, current: 2, total: 5 } }, { pid: 'link-1' }));
    expect(registry.get(progress.monitorAtom(key))).toBeUndefined();

    // Next chain link — a fresh pid — must NOT resurrect (this is what a pid tombstone would miss).
    sink.write(statusMessage({ message: 'Inbox', progress: { key, current: 3, total: 5 } }, { pid: 'link-2' }));
    expect(registry.get(progress.monitorAtom(key))).toBeUndefined();

    // The run ends (edge abort emits a terminal Cancelled) — releases the tombstone, still hidden.
    sink.write(statusMessage({ message: PROGRESS_STATUS_CANCELLED, progress: { key } }, { pid: 'link-2' }));
    expect(registry.get(progress.monitorAtom(key))).toBeUndefined();

    // A genuinely later run (next cron fire) re-shows.
    sink.write(statusMessage({ message: 'Inbox', progress: { key, current: 0, total: 5 } }, { pid: 'run-2' }));
    const task = registry.get(progress.monitorAtom(key));
    expect(task?.current).toBe(0);
    expect(task?.status).toBe('running');
  });

  test('a COMPLETE terminal after cancel also releases the tombstone', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress, { cancelProcess: () => {}, cancelScope: 'run' });
    const key = 'mailbox-uri#sync';

    sink.write(statusMessage({ message: 'Inbox', progress: { key, current: 1, total: 5 } }, { pid: 'link-1' }));
    progress.cancel(key);

    // The run drains and completes naturally before the abort lands — suppressed, but released.
    sink.write(statusMessage({ message: PROGRESS_STATUS_COMPLETE, progress: { key } }, { pid: 'link-2' }));
    expect(registry.get(progress.monitorAtom(key))).toBeUndefined();

    // Later run re-shows.
    sink.write(statusMessage({ message: 'Inbox', progress: { key, current: 0, total: 3 } }, { pid: 'run-2' }));
    expect(registry.get(progress.monitorAtom(key))?.status).toBe('running');
  });
});

describe('resolveTriggerId', () => {
  test('extracts the trigger object id from an echo ref', () => {
    const trigger = Ref.fromURI(EID.make({ entityId: 'TRIGGER1' }));
    expect(resolveTriggerId({ trigger })).toBe('TRIGGER1');
  });

  test('returns undefined when there is no trigger', () => {
    expect(resolveTriggerId({})).toBeUndefined();
  });
});
