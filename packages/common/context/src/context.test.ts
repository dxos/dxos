//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

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

  test('leak test', async () => {
    const ctx = new Context();

    ctx.maxSafeDisposeCallbacks = 1;

    ctx.onDispose(() => {});

    const triggerLeak = () => {
      ctx.onDispose(() => {});
    };

    triggerLeak();
    triggerLeak();
  });

  test('timeout sets the disposed property', async () => {
    const ctx = Context.withTimeout(100);
    expect(ctx.timeout).toEqual(expect.closeTo(100, 5));
    expect(ctx.deadlineReached).toBeFalsy();
    expect(ctx.disposed).toBeFalsy();

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(ctx.deadlineReached).toBeTruthy();
    expect(ctx.disposed).toBeTruthy();
  });

  test('timeout runs dispose hooks', async () => {
    const ctx = Context.withTimeout(100);

    let called = false;
    ctx.onDispose(() => {
      called = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(called).toBeTruthy();
  });
});
