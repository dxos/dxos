//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Registry from 'effect/reactivity/AtomRegistry';
import * as TestClock from 'effect/testing/TestClock';

import * as Progress from '@dxos/app-toolkit/Progress';

import { Mailbox } from '#types';

import { createSyncProgressKey } from './mail-sync.ts';
import { PENDING_SYNC_TIMEOUT_ERROR, PENDING_SYNC_TIMEOUT_MS, withPendingSyncMonitor } from './pending-monitor.ts';

class RequestRefusedError extends Data.TaggedError('RequestRefusedError')<{ message: string }> {}

const setup = () => {
  const progress = Progress.makeRegistry(Registry.make());
  const mailbox = Mailbox.make({ name: 'rich@example.com' });
  const key = createSyncProgressKey(mailbox);
  const task = () => progress.snapshot().tasks.find((entry) => entry.name === key);
  return { progress, mailbox, key, task };
};

describe('withPendingSyncMonitor', () => {
  it.effect(
    'shows the sync meter while the request is in flight',
    Effect.fnUntraced(function* ({ expect }) {
      const { progress, mailbox, task } = setup();
      let seen: ReturnType<typeof task>;
      yield* withPendingSyncMonitor(
        mailbox,
        progress,
        Effect.sync(() => {
          seen = task();
        }),
      );
      expect(seen).toMatchObject({ status: 'running', label: 'Syncing rich@example.com' });
    }),
  );

  it.effect(
    'fails a meter the run never takes over with a timeout error that can be dismissed',
    Effect.fnUntraced(function* ({ expect }) {
      const { progress, mailbox, key, task } = setup();
      yield* withPendingSyncMonitor(mailbox, progress, Effect.void);
      expect(task()?.status).toBe('running');

      yield* TestClock.adjust(PENDING_SYNC_TIMEOUT_MS);
      expect(task()).toMatchObject({ status: 'error', error: PENDING_SYNC_TIMEOUT_ERROR });

      // The meter's dismiss control routes through `cancel`.
      progress.cancel(key);
      expect(task()).toBeUndefined();
    }),
  );

  it.effect(
    'does not time out while the request is still in flight',
    Effect.fnUntraced(function* ({ expect }) {
      const { progress, mailbox, task } = setup();
      const fiber = yield* Effect.forkChild(
        withPendingSyncMonitor(mailbox, progress, Effect.sleep(2 * PENDING_SYNC_TIMEOUT_MS)),
      );

      yield* TestClock.adjust(PENDING_SYNC_TIMEOUT_MS);
      expect(task()?.status).toBe('running');

      // The clock starts when the request ends.
      yield* TestClock.adjust(PENDING_SYNC_TIMEOUT_MS);
      yield* Fiber.join(fiber);
      expect(task()?.status).toBe('running');
      yield* TestClock.adjust(PENDING_SYNC_TIMEOUT_MS);
      expect(task()?.status).toBe('error');
    }),
  );

  it.effect(
    'clears the meter when the request is interrupted',
    Effect.fnUntraced(function* ({ expect }) {
      const { progress, mailbox, task } = setup();
      const fiber = yield* Effect.forkChild(withPendingSyncMonitor(mailbox, progress, Effect.never));
      yield* Effect.yieldNow;
      expect(task()?.status).toBe('running');

      yield* Fiber.interrupt(fiber);
      expect(task()).toBeUndefined();
    }),
  );

  it.effect(
    "hands over to the run's own meter, which the timeout leaves alone",
    Effect.fnUntraced(function* ({ expect }) {
      const { progress, mailbox, key, task } = setup();
      // The trace sink registers the run's meter under the same key when the first update arrives.
      yield* withPendingSyncMonitor(
        mailbox,
        progress,
        Effect.sync(() => progress.register(key, { label: 'Syncing rich@example.com' }).set(5)),
      );

      yield* TestClock.adjust(PENDING_SYNC_TIMEOUT_MS);
      expect(task()).toMatchObject({ status: 'running', current: 5 });
    }),
  );

  it.effect(
    'shows a failed request as an error that the timeout keeps',
    Effect.fnUntraced(function* ({ expect }) {
      const { progress, mailbox, task } = setup();
      const exit = yield* Effect.exit(
        withPendingSyncMonitor(mailbox, progress, Effect.fail(new RequestRefusedError({ message: 'refused' }))),
      );
      expect(Exit.isFailure(exit)).toBe(true);
      expect(task()).toMatchObject({ status: 'error', error: 'refused' });

      yield* TestClock.adjust(PENDING_SYNC_TIMEOUT_MS);
      expect(task()?.status).toBe('error');
    }),
  );

  it.effect(
    'does not reset a run that is already reporting',
    Effect.fnUntraced(function* ({ expect }) {
      const { progress, mailbox, key, task } = setup();
      progress.register(key, { label: 'Syncing rich@example.com' }).set(3);

      yield* withPendingSyncMonitor(mailbox, progress, Effect.void);
      expect(task()).toMatchObject({ status: 'running', current: 3 });
    }),
  );
});
