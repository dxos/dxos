//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, expect, onTestFinished, test, vi } from 'vitest';

import * as Trace from '@dxos/compute/Trace';
import { Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';

import { createProgressRegistry } from './progress-registry';
import {
  PROGRESS_STATUS_CANCELLED,
  PROGRESS_STATUS_COMPLETE,
  PROGRESS_STATUS_FAILED,
  PROGRESS_STATUS_STALLED,
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

  // Mail sync's shape: the run starts with no total and accumulates one as each page is enumerated,
  // so the meter is briefly indeterminate and must become determinate the moment a total arrives.
  test('a total that arrives mid-run makes the task determinate', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress);
    const key = 'mailbox-uri#sync';

    sink.write(statusMessage({ message: 'Syncing', progress: { key, current: 0 } }));
    expect(registry.get(progress.monitorAtom(key))?.total).toBeUndefined();

    sink.write(statusMessage({ message: 'Syncing', progress: { key, current: 0, total: 468 } }));
    sink.write(statusMessage({ message: 'Syncing', progress: { key, current: 12, total: 468 } }));

    const task = registry.get(progress.monitorAtom(key));
    expect(task?.total).toBe(468);
    expect(task?.current).toBe(12);
  });

  // The same run reported from a different process (an EDGE continuation) re-registers the monitor;
  // the total it already reported has to survive that, or the meter falls back to a sweep mid-run.
  test('a total survives the monitor being re-registered by another pid', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress);
    const key = 'mailbox-uri#sync';

    sink.write(statusMessage({ message: 'Syncing', progress: { key, current: 4, total: 468 } }, { pid: 'run-1' }));
    sink.write(statusMessage({ message: 'Syncing', progress: { key, current: 9 } }, { pid: 'run-2' }));

    const task = registry.get(progress.monitorAtom(key));
    expect(task?.total).toBe(468);
    expect(task?.current).toBe(9);
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

// `plugin-magazine`'s curate run, which is what surfaced this: phase 0 counts the feeds, phase 1 is a
// single opaque agent call over every candidate and so reports no total. Observed in the statusbar as
// "Syncing feeds  0 / 1" with the stepper already on step 2 — phase 1 drawing phase 0's count.
describe('phase counts', () => {
  test('entering a phase clears the count the previous one reported', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress);
    const key = 'magazine-uri#curate';

    sink.write(
      statusMessage({ message: 'Syncing feeds', progress: { key, phases: 3, phase: 0, current: 0, total: 1 } }),
    );
    expect(registry.get(progress.monitorAtom(key))?.total).toBe(1);

    sink.write(statusMessage({ message: 'Selecting articles', progress: { key, phases: 3, phase: 1, current: 0 } }));
    const task = registry.get(progress.monitorAtom(key));
    // Uncountable: the meter must sweep, not claim 0 of the feed count it is no longer counting.
    expect(task?.total).toBeUndefined();
    expect(task?.phase).toBe(1);
  });

  test('a phase that declares its own total keeps it', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress);
    const key = 'magazine-uri#curate';

    sink.write(statusMessage({ progress: { key, phases: 3, phase: 1, current: 0 } }));
    sink.write(statusMessage({ progress: { key, phases: 3, phase: 2, current: 0, total: 7 } }));

    const task = registry.get(progress.monitorAtom(key));
    expect(task?.total).toBe(7);
    expect(task?.current).toBe(0);
  });

  // Updates WITHIN a phase are the common case and must not be mistaken for a phase change, or the
  // count would be wiped on every tick.
  test('progress within a phase keeps its count', () => {
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress);
    const key = 'magazine-uri#curate';

    sink.write(statusMessage({ progress: { key, phases: 3, phase: 2, current: 0, total: 7 } }));
    sink.write(statusMessage({ progress: { key, phases: 3, phase: 2, current: 3 } }));
    sink.write(statusMessage({ progress: { key, phases: 3, phase: 2, current: 5 } }));

    const task = registry.get(progress.monitorAtom(key));
    expect(task?.total).toBe(7);
    expect(task?.current).toBe(5);
  });
});

// Measured against a live mailbox on 2026-08-23: an edge sync emitted its opening status and nothing
// further — no total, no increments, and no terminal — leaving the meter sweeping indefinitely over a
// run that was no longer reporting. Every terminal a producer can emit travels the same lossy path
// its progress does (a killed process runs no finalizer, a defect escapes the error channel, a swarm
// broadcast is fire-and-forget), so the sink cannot rely on being told a run ended.
describe('stall bound', () => {
  const STALL = 90_000;

  const withFakeTimers = () => {
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });
  };

  test('fails a monitor that stops reporting, and says only that it stopped', () => {
    withFakeTimers();
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress);
    const key = 'mailbox-uri#sync';

    sink.write(statusMessage({ message: 'Syncing', progress: { key, current: 0 } }));
    expect(registry.get(progress.monitorAtom(key))?.status).toBe('running');

    vi.advanceTimersByTime(STALL - 1);
    expect(registry.get(progress.monitorAtom(key))?.status).toBe('running');

    vi.advanceTimersByTime(1);
    const task = registry.get(progress.monitorAtom(key));
    expect(task?.status).toBe('error');
    // Not "failed": the run may have finished or still be going — what is known is that it went quiet.
    expect(task?.error).toBe(PROGRESS_STATUS_STALLED);
  });

  // The clock measures the gap between updates, not the run's length: a long sync that keeps
  // reporting is healthy and must never be failed for taking its time.
  test('a run that keeps reporting is never stalled, however long it takes', () => {
    withFakeTimers();
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress);
    const key = 'mailbox-uri#sync';

    sink.write(statusMessage({ message: 'Syncing', progress: { key, current: 0, total: 500 } }));
    for (let current = 1; current <= 10; ++current) {
      vi.advanceTimersByTime(STALL - 1_000);
      sink.write(statusMessage({ message: 'Syncing', progress: { key, current } }));
    }

    const task = registry.get(progress.monitorAtom(key));
    expect(task?.status).toBe('running');
    expect(task?.current).toBe(10);
  });

  // An edge continuation reports under a fresh pid against the same run, so it re-points the entry
  // rather than re-registering — the path that would most easily lose the timer.
  test('a continuation under a new pid keeps the run bounded', () => {
    withFakeTimers();
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress);
    const key = 'mailbox-uri#sync';

    sink.write(statusMessage({ message: 'Syncing', progress: { key, current: 1, total: 9 } }, { pid: 'run-1' }));
    vi.advanceTimersByTime(1_000);
    sink.write(statusMessage({ message: 'Syncing', progress: { key, current: 4 } }, { pid: 'run-2' }));

    vi.advanceTimersByTime(STALL);
    expect(registry.get(progress.monitorAtom(key))?.status).toBe('error');
  });

  test('a completed run is not failed afterwards', () => {
    withFakeTimers();
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress);
    const key = 'mailbox-uri#sync';

    sink.write(statusMessage({ message: 'Syncing', progress: { key, current: 0, total: 2 } }));
    sink.write(statusMessage({ message: PROGRESS_STATUS_COMPLETE, progress: { key } }));

    vi.advanceTimersByTime(STALL * 2);
    expect(registry.get(progress.monitorAtom(key))).toBeUndefined();
  });

  // A reported failure names a cause; a stall firing over it would replace that with a guess.
  test('a reported failure keeps its own reason', () => {
    withFakeTimers();
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress);
    const key = 'mailbox-uri#sync';

    sink.write(statusMessage({ message: 'Syncing', progress: { key, current: 1, total: 5 } }));
    sink.write(statusMessage({ message: PROGRESS_STATUS_FAILED, progress: { key } }));

    vi.advanceTimersByTime(STALL * 2);
    expect(registry.get(progress.monitorAtom(key))?.error).toBe(PROGRESS_STATUS_FAILED);
  });

  // The stall is a giving-up, not a verdict on the key: the next run gets a clean meter, and starts
  // from its own numbers rather than inheriting the abandoned run's.
  test('a later run recovers the meter and does not inherit the stalled run count', () => {
    withFakeTimers();
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress);
    const key = 'mailbox-uri#sync';

    sink.write(statusMessage({ message: 'Syncing', progress: { key, current: 40, total: 468 } }, { pid: 'run-1' }));
    vi.advanceTimersByTime(STALL);
    expect(registry.get(progress.monitorAtom(key))?.status).toBe('error');

    sink.write(statusMessage({ message: 'Syncing', progress: { key, current: 0 } }, { pid: 'run-2' }));
    const task = registry.get(progress.monitorAtom(key));
    expect(task?.status).toBe('running');
    expect(task?.current).toBe(0);
    expect(task?.total).toBeUndefined();
    expect(task?.error).toBeUndefined();
  });

  // The dismiss control on a failed meter routes back through the sink, which has to still know the
  // key — a stall that forgot the monitor would leave a meter nothing can clear.
  test('a stalled monitor can still be dismissed', () => {
    withFakeTimers();
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress, { cancelProcess: () => {} });
    const key = 'mailbox-uri#sync';

    sink.write(statusMessage({ message: 'Syncing', progress: { key, current: 1 } }, { pid: 'run-1' }));
    vi.advanceTimersByTime(STALL);
    expect(registry.get(progress.monitorAtom(key))?.status).toBe('error');

    progress.cancel(key);
    expect(registry.get(progress.monitorAtom(key))).toBeUndefined();
  });

  test('the bound can be disabled for a producer whose terminal cannot be lost', () => {
    withFakeTimers();
    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress, { stallTimeout: 0 });
    const key = 'mailbox-uri#sync';

    sink.write(statusMessage({ message: 'Syncing', progress: { key, current: 0 } }));
    vi.advanceTimersByTime(STALL * 10);
    expect(registry.get(progress.monitorAtom(key))?.status).toBe('running');
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

  test('the tombstone expires so a lost terminal cannot hide every later run', () => {
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });

    const registry = Registry.make();
    const progress = createProgressRegistry(registry);
    const sink = createProgressTraceSink(progress, { cancelProcess: () => {}, cancelScope: 'run' });
    const key = 'mailbox-uri#sync';

    sink.write(statusMessage({ message: 'Inbox', progress: { key, current: 1, total: 5 } }, { pid: 'link-1' }));
    progress.cancel(key);

    // The terminal broadcast never arrives (dropped swarm publish).
    vi.advanceTimersByTime(30_000);
    sink.write(statusMessage({ message: 'Inbox', progress: { key, current: 2, total: 5 } }, { pid: 'link-2' }));
    expect(registry.get(progress.monitorAtom(key))).toBeUndefined();

    // Past the TTL the suppression lifts on its own.
    vi.advanceTimersByTime(31_000);
    sink.write(statusMessage({ message: 'Inbox', progress: { key, current: 0, total: 5 } }, { pid: 'run-2' }));
    expect(registry.get(progress.monitorAtom(key))?.status).toBe('running');
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
