//
// Copyright 2022 DXOS.org
//

import { test } from '@dxos/test';

import { TestStream } from './test-stream';

test('TestStream', async () => {
  const stream1 = new TestStream();
  const stream2 = new TestStream();
  stream1.pipe(stream2).pipe(stream1);

  stream1.push('ping');
  stream2.push('pong');

  await Promise.all([stream2.assertReceivedAsync('ping'), stream1.assertReceivedAsync('pong')]);
});
