//
// Copyright 2021 DXOS.org
//

import { describe, test } from 'vitest';

import { Stream, getFirstStreamValue } from './stream';

describe('Stream', () => {
  test('can consume a stream that immediately closes', async ({ expect }) => {
    const stream = new Stream(({ next, close }) => {
      next('foo');
      next('bar');
      next('baz');
      close();
    });

    expect(await Stream.consume(stream)).to.deep.equal([
      { ready: true },
      { data: 'foo' },
      { data: 'bar' },
      { data: 'baz' },
      { closed: true },
    ]);
  });

  test('can consume a stream that produces items over time', async ({ expect }) => {
    const stream = new Stream(({ next, close }) => {
      void (async () => {
        await sleep(5);
        next('foo');
        await sleep(5);
        next('bar');
        await sleep(5);
        next('baz');
        await sleep(5);
        close();
      })();
    });

    expect(await Stream.consume(stream)).to.deep.equal([
      { ready: true },
      { data: 'foo' },
      { data: 'bar' },
      { data: 'baz' },
      { closed: true },
    ]);
  });

  test('close error is buffered', async ({ expect }) => {
    const error = new Error('test');
    const stream = new Stream(({ close }) => {
      close(error);
    });

    expect(await Stream.consume(stream)).to.deep.equal([{ closed: true, error }]);
  });

  test('subscribe gets all updates', async ({ expect }) => {
    let nextCb: (value: string) => void = () => {};
    const stream = new Stream<string>(({ next }) => {
      nextCb = next;
    });
    nextCb('first');
    const received: string[] = [];
    stream.subscribe(
      (msg) => received.push(msg),
      () => {},
    );
    nextCb('second');
    expect(received).to.deep.equal(['first', 'second']);
  });

  test('closing stream disposes the context', async ({ expect }) => {
    let disposed = false;
    const stream = new Stream<string>(({ ctx }) => {
      ctx.onDispose(() => {
        disposed = true;
      });
    });
    expect(disposed).to.be.false;
    await stream.close();
    expect(disposed).to.be.true;
  });

  test('thrown errors are caught be context', ({ expect }) => {
    const stream = new Stream<string>(({ ctx }) => {
      throw new Error('test');
    });

    let error!: Error;
    stream.subscribe(
      () => {},
      (err) => {
        error = err!;
      },
    );
    expect(error.message).to.equal('test');
  });
});

// To not introduce a dependency on @dxos/async.
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('getFirstStreamValue', () => {
  test('resolves with the first value', async ({ expect }) => {
    const stream = new Stream<number>(({ next }) => {
      next(1);
      next(2);
    });
    await expect(getFirstStreamValue(stream)).resolves.toBe(1);
  });

  test('rejects with the stream error when it closes unfulfilled', async ({ expect }) => {
    const stream = new Stream<number>(({ close }) => close(new Error('failed')));
    await expect(getFirstStreamValue(stream)).rejects.toThrow('failed');
  });

  test('rejects rather than hanging on a clean close', async ({ expect }) => {
    const stream = new Stream<number>(({ close }) => close());
    await expect(getFirstStreamValue(stream)).rejects.toThrow('Stream closed before emitting a value.');
  });

  test('leaves an already-subscribed stream open when it cannot subscribe', async ({ expect }) => {
    let emit!: (value: number) => void;
    const stream = new Stream<number>(({ next }) => {
      emit = next;
    });
    const received: number[] = [];
    stream.subscribe((value) => received.push(value));

    await expect(getFirstStreamValue(stream)).rejects.toThrow('already subscribed');

    // The original subscriber still gets values, so the failed call did not close its stream.
    emit(1);
    expect(received).toEqual([1]);
    await stream.close();
  });
});
