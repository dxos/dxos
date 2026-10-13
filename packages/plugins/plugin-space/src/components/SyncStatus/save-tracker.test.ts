//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test } from 'vitest';

import { Event, Trigger } from '@dxos/async';
import { type SaveStateChangedEvent } from '@dxos/echo-client';

import { createSpaceSaveTracker } from './save-tracker.ts';

describe('createSpaceSaveTracker', () => {
  test('a failed flush reports the save as failing instead of leaving an unhandled rejection', async ({ expect }) => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);
    onTestFinished(() => {
      process.off('unhandledRejection', onUnhandled);
    });

    const saveStateChanged = new Event<SaveStateChangedEvent>();
    const flushed = new Trigger<{ flush: Promise<void> }>();
    const failure = new Error('Failed to execute statement', { cause: new RangeError('Bad value') });
    const states: string[] = [];
    const dispose = createSpaceSaveTracker(
      {
        waitUntilReady: async () => {},
        db: {
          saveStateChanged,
          flush: () => {
            const flush = Promise.reject(failure);
            flushed.wake({ flush });
            return flush;
          },
        },
      },
      (state) => states.push(state),
    );
    onTestFinished(dispose);

    await new Promise((resolve) => setTimeout(resolve));
    saveStateChanged.emit({ unsavedDocuments: [], pendingCreations: 0, failing: false });
    await expect((await flushed.wait()).flush).rejects.toBe(failure);
    // Unhandled rejections are reported after the microtask queue drains, so give it one macrotask.
    await new Promise((resolve) => setImmediate(resolve));

    expect(unhandled).toEqual([]);
    expect(states).toEqual(['failing']);
  });

  test('a change the worker would not take is failing, and saved once it does', async ({ expect }) => {
    const saveStateChanged = new Event<SaveStateChangedEvent>();
    const states = new Event<string>();
    const dispose = createSpaceSaveTracker(
      { waitUntilReady: async () => {}, db: { saveStateChanged, flush: async () => {} } },
      (state) => states.emit(state),
    );
    onTestFinished(dispose);
    await new Promise((resolve) => setTimeout(resolve));

    const failing = states.waitForCount(1);
    saveStateChanged.emit({ unsavedDocuments: [], pendingCreations: 1, failing: true });
    expect(await failing).toBe('failing');
    const saved = states.waitFor((state) => state === 'saved');
    saveStateChanged.emit({ unsavedDocuments: [], pendingCreations: 0, failing: false });
    await saved;
  });
});
