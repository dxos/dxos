//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Context } from './context.ts';
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

  test('a failed open runs again on the next open and disposes the failed attempt', async () => {
    const error = new Error('open failed');
    const contexts: Context[] = [];
    class FlakyResource extends TestResource {
      opens = 0;
      protected override async _open(): Promise<void> {
        contexts.push(this._ctx);
        if (this.opens++ === 0) {
          throw error;
        }
      }
    }

    const resource = new FlakyResource();
    await expect(resource.open()).rejects.toBe(error);
    expect(resource.lifecycleState).toEqual(LifecycleState.CLOSED);
    expect(contexts[0].disposed).toBe(true);

    await resource.open(new Context());
    expect(resource.opens).toBe(2);
    expect(resource.lifecycleState).toEqual(LifecycleState.OPEN);
    expect(contexts[1].disposed).toBe(false);

    await resource.close();
    expect(contexts[1].disposed).toBe(true);
  });
});
