//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { describe, test } from '@dxos/test';

import { Context } from './context';

describe('Context', () => {
  test('dispose calls dispose hooks', () => {
    const ctx = new Context();

    let called = false;
    ctx.onDispose(() => {
      called = true;
    });

    void ctx.dispose();
    expect(called).toBeTruthy();
  });

  test('dispose waits for async callbacks', () => {});

  test('error in dispose callbacks are not propagated', () => {});

  test('raised errors are propagated to the error handler', () => {
    let error!: Error;
    const ctx = new Context({
      onError: (err) => {
        error = err;
      },
    });

    ctx.raise(new Error('test'));
    expect(error.message).toEqual('test');
  });

  test('instanceof', () => {
    const ctx = new Context();
    expect(ctx instanceof Context).toBeTruthy();

    expect({} instanceof Context).toBeFalsy();

    expect((undefined as any) instanceof Context).toBeFalsy();
  });

  test('dispose is idempotent', () => {
    const ctx = new Context();

    let called = false;
    ctx.onDispose(() => {
      called = true;
    });

    void ctx.dispose();
    void ctx.dispose();
    expect(called).toBeTruthy();
  });

  test('canceling a context with derived contexts calls dispose hooks', async () => {
    let childCalled = false;
    let parentCalled = false;

    const parentCtx = new Context();
    parentCtx.onDispose(() => {
      parentCalled = true;
    });

    const childCtx = parentCtx.derive();
    childCtx.onDispose(() => {
      childCalled = true;
    });

    await parentCtx.dispose();
    expect(parentCalled).toBeTruthy();
    expect(childCalled).toBeTruthy();
  });

  test('callbacks are called in reverse order', async () => {
    const ctx = new Context();

    const order: number[] = [];
    ctx.onDispose(() => {
      order.push(1);
    });

    ctx.onDispose(() => {
      order.push(2);
    });

    await ctx.dispose();
    expect(order).toEqual([2, 1]);
  });
});
