//
// Copyright 2024 DXOS.org
//

import path from 'node:path';

import { sleep } from '@dxos/async';
import { describe, test } from '@dxos/test';

import { PerformanceEvents, writeEventStreamToAFile } from './performance-events';

// Note: Skiped the test because it produces a file in the file system, and it is not automatically tested.
describe.skip('perfetto traces', () => {
  test('performance marks', async () => {
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
    writeEventStreamToAFile({ stream: trace.stream, path: outPath });

    trace.begin({ name: '1' });
    await sleep(100);
    trace.begin({ name: '2' });
    await sleep(100);

    trace.end({ name: '2' as any });
    await sleep(100);

    trace.end({ name: '1' as any });
    trace.destroy();
  });
});
