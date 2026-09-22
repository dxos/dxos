//
// Copyright 2022 DXOS.org
//

import { test } from 'vitest';

import { TestStream } from './test-stream.ts';

test('TestStream', async () => {
  const stream1 = new TestStream();
  const stream2 = new TestStream();
  void stream1.readable.pipeTo(stream2.writable).catch(() => {});
  void stream2.readable.pipeTo(stream1.writable).catch(() => {});

  stream1.push('ping');
  stream2.push('pong');

  await Promise.all([stream2.assertReceivedAsync('ping'), stream1.assertReceivedAsync('pong')]);
});
