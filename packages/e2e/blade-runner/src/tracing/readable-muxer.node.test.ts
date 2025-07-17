//
// Copyright 2024 DXOS.org
//

import { onTestFinished, describe, expect, test } from 'vitest';

import { sleep } from '@dxos/async';
import { range } from '@dxos/util';

import { ReadableMuxer } from './readable-muxer';

describe('ReadableMuxer', () => {
  test('Mux 3 streams together', async () => {
    const muxer = new ReadableMuxer();
    onTestFinished(() => muxer.close());
    const readableStreams = range(3).map(
      () =>
        new ReadableStream({
          start: (controller) => {
            controller.enqueue('a');
            controller.enqueue('b');
            controller.enqueue('c');
            controller.close();
          },
        }),
    );

    for (const stream of readableStreams) {
      muxer.pushStream(stream);
      await sleep(10);
    }

    const reader = muxer.readable.getReader();

    const values = [];
    for (let i = 0; i < 9; i++) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      values.push(value);
    }

    expect(values).to.deep.equal(['a', 'b', 'c', 'a', 'b', 'c', 'a', 'b', 'c']);
  });
});
