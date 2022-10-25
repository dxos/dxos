//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { Stream } from './stream';

describe('Stream', function () {
  it('can consume a stream that immediately closes', async function () {
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
      { closed: true }
    ]);
  });

  it('can consume a stream that produces items over time', async function () {
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
      { closed: true }
    ]);
  });

  it('close error is buffered', async function () {
    const error = new Error('test');
    const stream = new Stream(({ close }) => {
      close(error);
    });

    expect(await Stream.consume(stream)).to.deep.equal([{ closed: true, error }]);
  });

  it('subscribe gets all updates', async function () {
    let nextCb: (value: string) => void = () => {};
    const stream = new Stream<string>(({ next }) => {
      nextCb = next;
    });
    nextCb('first');
    const received: string[] = [];
    stream.subscribe(
      (msg) => received.push(msg),
      () => {}
    );
    nextCb('second');
    expect(received).to.deep.equal(['first', 'second']);
  });
});

// To not introduce a dependency on @dxos/async.
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
