//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { describe, test } from '@dxos/test';

import { Context } from './context';

describe('Context', function () {
  test('dispose calls dispose hooks', function () {
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

  test('raised errors are propagated to the error handler', function () {
    let error!: Error;
    const ctx = new Context({
      onError: (err) => {
        error = err;
      }
    });

    ctx.raise(new Error('test'));
    expect(error.message).toEqual('test');
  });

  test('instanceof', function () {
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
