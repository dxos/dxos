//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { executeChange, queueNotification, queueOwnerNotification } from './change-context';
import { batchEvents, drainEventTargets, emitEvent, rethrowEmitErrors } from './event-batch';
import { EventId } from './symbols';

/**
 * The pending queues in `event-batch` and `change-context` are module-level, so they are GC roots:
 * a target stranded by a throwing emission would retain a live proxy — and the object graph behind
 * it — for the lifetime of the process, and be emitted again by the next batch.
 *
 * These pin that invariant, not a live reproduction: today `[EventId]` is always a `@dxos/async`
 * `Event`, whose `emit` routes a throwing listener to `Context.raise` (never rethrowing) and whose
 * only synchronous throw sits behind the disabled `DO_NOT_ERROR_ON_ASYNC_CALLBACK` flag. So the
 * targets here carry a stub emitter that throws, which is what any future emitter may do.
 */

type Target = { [EventId]: { emit: () => void }; emitted: number };

const makeTarget = (message?: string): Target => {
  const target: Target = {
    [EventId]: {
      emit: () => {
        target.emitted++;
        if (message !== undefined) {
          throw new Error(message);
        }
      },
    },
    emitted: 0,
  };
  return target;
};

describe('drainEventTargets', () => {
  test('clears the queue and emits every target even when one throws', ({ expect }) => {
    const first = makeTarget('first');
    const second = makeTarget();
    const queue = new Set<object>([first, second]);

    const errors: unknown[] = [];
    drainEventTargets(queue, errors);

    expect(queue.size).to.eq(0);
    expect(first.emitted).to.eq(1);
    expect(second.emitted).to.eq(1);
    expect(errors).to.have.length(1);
  });

  test('collects one error per throwing target', ({ expect }) => {
    const queue = new Set<object>([makeTarget('a'), makeTarget('b')]);

    const errors: unknown[] = [];
    drainEventTargets(queue, errors);

    expect(queue.size).to.eq(0);
    expect(errors.map((err) => (err as Error).message)).to.deep.eq(['a', 'b']);
  });
});

describe('rethrowEmitErrors', () => {
  test('no errors is a no-op', ({ expect }) => {
    expect(() => rethrowEmitErrors([])).to.not.throw();
  });

  test('a single error is rethrown as-is', ({ expect }) => {
    const err = new Error('only');
    expect(() => rethrowEmitErrors([err])).to.throw(err);
  });

  test('multiple errors are aggregated so none is hidden', ({ expect }) => {
    let caught: unknown;
    try {
      rethrowEmitErrors([new Error('a'), new Error('b')]);
    } catch (err) {
      caught = err;
    }

    expect(caught).to.be.instanceOf(AggregateError);
    expect((caught as AggregateError).errors.map((err: Error) => err.message)).to.deep.eq(['a', 'b']);
  });
});

describe('batchEvents', () => {
  test('coalesces to one emission per target', ({ expect }) => {
    const target = makeTarget();

    batchEvents(() => {
      emitEvent(target);
      emitEvent(target);
    });

    expect(target.emitted).to.eq(1);
  });

  test('a throwing target does not strand the pending queue in the next batch', ({ expect }) => {
    const first = makeTarget('boom');
    const second = makeTarget();

    expect(() =>
      batchEvents(() => {
        emitEvent(first);
        emitEvent(second);
      }),
    ).to.throw('boom');

    // Both were emitted despite the throw, and neither is still queued.
    expect(first.emitted).to.eq(1);
    expect(second.emitted).to.eq(1);

    const third = makeTarget();
    batchEvents(() => emitEvent(third));

    expect(third.emitted).to.eq(1);
    expect(first.emitted).to.eq(1);
    expect(second.emitted).to.eq(1);
  });
});

describe('executeChange', () => {
  test('drains the owner queue when the primary emission throws', ({ expect }) => {
    const contextKey = {};
    const primary = makeTarget('primary');
    const owner = makeTarget();

    expect(() =>
      executeChange(contextKey, primary, {}, () => {
        queueNotification(contextKey);
        queueOwnerNotification(owner);
      }),
    ).to.throw('primary');

    expect(primary.emitted).to.eq(1);
    expect(owner.emitted).to.eq(1);

    // The stale owner must not be emitted again by an unrelated change.
    const nextKey = {};
    const nextPrimary = makeTarget();
    executeChange(nextKey, nextPrimary, {}, () => queueNotification(nextKey));

    expect(nextPrimary.emitted).to.eq(1);
    expect(owner.emitted).to.eq(1);
  });

  test('a throwing owner does not strand the queue in the next change', ({ expect }) => {
    const contextKey = {};
    const primary = makeTarget();
    const throwingOwner = makeTarget('owner');
    const otherOwner = makeTarget();

    expect(() =>
      executeChange(contextKey, primary, {}, () => {
        queueNotification(contextKey);
        queueOwnerNotification(throwingOwner);
        queueOwnerNotification(otherOwner);
      }),
    ).to.throw('owner');

    expect(primary.emitted).to.eq(1);
    expect(throwingOwner.emitted).to.eq(1);
    expect(otherOwner.emitted).to.eq(1);

    const nextKey = {};
    const nextPrimary = makeTarget();
    const nextOwner = makeTarget();
    executeChange(nextKey, nextPrimary, {}, () => {
      queueNotification(nextKey);
      queueOwnerNotification(nextOwner);
    });

    expect(nextOwner.emitted).to.eq(1);
    expect(throwingOwner.emitted).to.eq(1);
    expect(otherOwner.emitted).to.eq(1);
  });

  test('aggregates a throwing primary and a throwing owner', ({ expect }) => {
    const contextKey = {};
    const primary = makeTarget('primary');
    const owner = makeTarget('owner');

    let caught: unknown;
    try {
      executeChange(contextKey, primary, {}, () => {
        queueNotification(contextKey);
        queueOwnerNotification(owner);
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).to.be.instanceOf(AggregateError);
    expect((caught as AggregateError).errors.map((err: Error) => err.message)).to.deep.eq(['primary', 'owner']);
  });
});
