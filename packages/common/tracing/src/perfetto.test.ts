//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import path from 'node:path';

import { sleep } from '@dxos/async';
import { afterTest, describe, test } from '@dxos/test';

import { PerformanceEvents, writeEventStreamToAFile } from './performance-events';

describe('perfetto traces', () => {
  // Note: Skiped the test because it produces a file in the file system, and it is not automatically tested.
  test.skip('write traces to a file', async () => {
    const trace = new PerformanceEvents({
      fields: {
        cat: 'default',
        args: {
          platform: globalThis.process?.platform,
          arch: globalThis.process?.arch,
        },
        'something-else': 'value',
      },
    });

    const outPath = path.join(__dirname, '..', 'out', 'trace.json');
    /**
     * Inspect the file in https://ui.perfetto.dev/
     */
    writeEventStreamToAFile({ stream: trace.stream, path: outPath });

    trace.begin({ name: '1' });
    await sleep(10);
    trace.begin({ name: '2' });

    trace.completeEvent({ name: '3', duration: 5 });
    await sleep(10);

    trace.end({ name: '1' });
    await sleep(10);

    trace.instantEvent({ name: '4' });

    trace.end({ name: '2' });
    trace.destroy();
  });

  test('traces are created correctly', async () => {
    const trace = new PerformanceEvents({
      fields: {
        cat: 'default',
        'something-else': 'value',
      },
    });
    afterTest(() => trace.destroy());

    trace.begin({ name: '1' });
    trace.end({ name: '1' });
    trace.destroy();

    const reader = trace.stream.getReader();

    const events = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      events.push(JSON.parse(value));
    }

    expect(events).to.have.length(2);
    expect(events[0]).to.deep.include({
      tid: 0,
      ph: 'B',
      cat: 'default',
      'something-else': 'value',
      name: '1',
    });

    expect(events[1]).to.deep.include({
      tid: 0,
      ph: 'E',
      cat: 'default',
      'something-else': 'value',
      name: '1',
    });
  });
});
