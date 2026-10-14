//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test } from 'vitest';

import { Event, Trigger } from '@dxos/async';
import { Obj } from '@dxos/echo';
import { type SaveStateChangedEvent } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Expando } from '@dxos/schema';

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

  test('a change reads as saving as soon as it is made, and saved once the worker takes it', async ({ expect }) => {
    const builder = await new EchoTestBuilder().open();
    onTestFinished(async () => {
      await builder.close();
    });
    const { db } = await builder.createDatabase({ types: [Expando.Expando] });
    const object = db.add(Obj.make(Expando.Expando, { value: 0 }));
    await db.flush();

    const states = new Event<string>();
    const seen: string[] = [];
    states.on((state) => {
      seen.push(state);
    });
    const dispose = createSpaceSaveTracker({ waitUntilReady: async () => {}, db }, (state) => states.emit(state));
    onTestFinished(dispose);
    await new Promise((resolve) => setTimeout(resolve));

    Obj.update(object, (object) => {
      object.value = 1;
    });
    expect(seen).toEqual(['saving']);
    await states.waitFor((state) => state === 'saved');
  });
});
