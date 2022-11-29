//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { Context } from './context';

describe('Context', function () {
  it('dispose calls dispose hooks', function () {
    const ctx = new Context();

    let called = false;
    ctx.onDispose(() => {
      called = true;
    });

    void ctx.dispose();
    expect(called).toBeTruthy();
  });

  it('dispose waits for async callbacks');

  it('error in dispose callbacks are not propagated');

  it('raised errors are propagated to the error handler', function () {
    let error!: Error;
    const ctx = new Context({
      onError: (err) => {
        error = err;
      }
    });

    ctx.raise(new Error('test'));
    expect(error.message).toEqual('test');
  });

  it('instanceof', function () {
    const ctx = new Context();
    expect(ctx instanceof Context).toBeTruthy();

    expect({} instanceof Context).toBeFalsy();

    expect((undefined as any) instanceof Context).toBeFalsy();
  });

  it('dispose is idempotent', function () {
    const ctx = new Context();

    let called = false;
    ctx.onDispose(() => {
      called = true;
    });

    void ctx.dispose();
    void ctx.dispose();
    expect(called).toBeTruthy();
  });
});
