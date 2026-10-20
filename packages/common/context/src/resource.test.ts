//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { LifecycleState, Resource } from './resource.ts';

class TestResource extends Resource {
  get lifecycleState() {
    return this._lifecycleState;
  }
}

describe('Resource', () => {
  test('open and close', async () => {
    const resource = new TestResource();
    expect(resource.lifecycleState).toEqual(LifecycleState.CLOSED);

    await resource.open();
    expect(resource.lifecycleState).toEqual(LifecycleState.OPEN);

    await resource.close();
    expect(resource.lifecycleState).toEqual(LifecycleState.CLOSED);
  });

  test('reentrant', async () => {
    const resource = new TestResource();

    await resource.open();
    await resource.close();
    expect(resource.lifecycleState).toEqual(LifecycleState.CLOSED);

    await resource.open();
    expect(resource.lifecycleState).toEqual(LifecycleState.OPEN);

    await resource.close();
    expect(resource.lifecycleState).toEqual(LifecycleState.CLOSED);
  });

  test('a failed open releases its context and can be retried', async () => {
    let attempts = 0;
    let released = 0;
    class FlakyResource extends TestResource {
      protected override async _open(): Promise<void> {
        this._ctx.onDispose(() => {
          released++;
        });
        if (++attempts === 1) {
          throw new Error('first open fails');
        }
      }
    }

    const resource = new FlakyResource();
    await expect(resource.open()).rejects.toThrow('first open fails');
    expect(resource.lifecycleState).toEqual(LifecycleState.CLOSED);
    expect(released).toEqual(1);

    await resource.open();
    expect(resource.lifecycleState).toEqual(LifecycleState.OPEN);
    expect(released).toEqual(1);
  });
});
