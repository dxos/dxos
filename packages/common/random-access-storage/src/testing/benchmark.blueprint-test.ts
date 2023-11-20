//
// Copyright 2021 DXOS.org
//

import randomBytes from 'randombytes';

import { latch } from '@dxos/async';
import { describe, test } from '@dxos/test';
import { range } from '@dxos/util';

import { type Storage, type StorageType } from '../common';

export const randomText = () => Math.random().toString(36).substring(2);

// https://gist.github.com/dmaretskyi/20604a10f85704406bbc1a3c672db1e5
export const storageBenchmark = (testGroupName: StorageType, createStorage: () => Storage) => {
  describe(testGroupName, () => {
    test('individual writers', async () => {
      const DATA_SIZE = 1024;
      const NUM_THREADS = 30;
      const NUM_READS = 1;
      const NUM_WRITES = 10;
      const RUN_TIME = 3_000;

      const dataSamples = range(100).map(() => Buffer.from(randomBytes(DATA_SIZE)));
      const randomSample = () => dataSamples[Math.floor(Math.random() * dataSamples.length)];

      const storage = createStorage();
      const directory = storage.createDirectory();

      let numReads = 0;
      let numWrites = 0;
      const writes: number[] = [];
      const reads: number[] = [];

      const startTime = performance.now();
      const [allDone, done] = latch({ count: NUM_THREADS });
      for (const threadId of range(NUM_THREADS)) {
        const fileName = `file-${threadId}`;
        setTimeout(async () => {
          try {
            // open file
            const file = directory.getOrCreateFile(fileName);

            while (performance.now() - startTime < RUN_TIME) {
              for (const _ of range(NUM_WRITES)) {
                // Write
                const start = performance.now();
                await file.write(0, randomSample());
                writes.push(performance.now() - start);
                numWrites++;
              }

              for (const _ of range(NUM_READS)) {
                // Read
                const start = performance.now();
                await file.read(0, DATA_SIZE);
                reads.push(performance.now() - start);
                numReads++;
              }
            }

            // close file
            await file.close();
          } finally {
            done();
          }
        });
      }

      await allDone();
      const realRunTime = performance.now() - startTime;

      console.log({
        params: {
          environment: mochaExecutor.environment,
          date: new Date().toISOString(),
          type: testGroupName,
          DATA_SIZE,
          NUM_THREADS,
          NUM_READS,
          NUM_WRITES,
          RUN_TIME,
        },
        result: {
          numReads,
          numWrites,
          realRunTime,
          avgReadTime: reads.reduce((a, b) => a + b, 0) / reads.length,
          avgWriteTime: writes.reduce((a, b) => a + b, 0) / writes.length,
        },
      });
    });
  });
};
