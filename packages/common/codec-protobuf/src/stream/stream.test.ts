//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Stream } from './stream';

describe('Stream', () => {
  test('can consume a stream that immediately closes', async () => {
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

  test('can consume a stream that produces items over time', async () => {
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

  test('close error is buffered', async () => {
    const error = new Error('test');
    const stream = new Stream(({ close }) => {
      close(error);
    });

    expect(await Stream.consume(stream)).to.deep.equal([{ closed: true, error }]);
  });

  test('subscribe gets all updates', async () => {
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

  test('closing stream disposes the context', async () => {
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

  test('thrown errors are caught be context', () => {
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
