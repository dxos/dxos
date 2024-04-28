import expect from 'expect';
import { describe, test } from '@dxos/test';
import { LifecycleState, Resource } from './resource';

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

  test('reopen', async () => {
    const resource = new TestResource();

    await resource.open();
    await resource.close();
    expect(resource.lifecycleState).toEqual(LifecycleState.CLOSED);

    await resource.open();
    expect(resource.lifecycleState).toEqual(LifecycleState.OPEN);

    await resource.close();
    expect(resource.lifecycleState).toEqual(LifecycleState.CLOSED);
  });
});