//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test } from 'vitest';

import { Event, Trigger } from '@dxos/async';
import { type SaveStateChangedEvent } from '@dxos/echo-client';

import { createSpaceSaveTracker } from './save-tracker.ts';

describe('createSpaceSaveTracker', () => {
  test('a failed flush reports the space unsaved instead of leaving an unhandled rejection', async ({ expect }) => {
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
    saveStateChanged.emit({ unsavedDocuments: [] });
    await expect((await flushed.wait()).flush).rejects.toBe(failure);
    // Unhandled rejections are reported after the microtask queue drains, so give it one macrotask.
    await new Promise((resolve) => setImmediate(resolve));

    expect(unhandled).toEqual([]);
    expect(states).toEqual(['saving']);
  });
});
