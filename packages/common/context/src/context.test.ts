import { Context } from "./context";
import expect from 'expect';

describe('Context', () => {
  it('dispose calls dispose hooks', () => {
    const ctx = new Context();

    let called = false;
    ctx.onDispose(() => {
      called = true;
    });

    void ctx.dispose();
    expect(called).toBeTruthy();
  })

  it('dispose waits for async callbacks')

  it('error in dispose callbacks are not propagated')

  it('raised errors are propagated to the error handler', () => {
    let error!: Error;
    const ctx = new Context({
      onError: err => {
        error = err;
      }
    });

    ctx.raise(new Error('test'));
    expect(error.message).toEqual('test');
  })

  it('isContext', () => {
    const ctx = new Context();
    expect(Context.isContext(ctx)).toBeTruthy();

    expect(Context.isContext({})).toBeFalsy();

    expect(Context.isContext(undefined)).toBeFalsy();
  })
})