import { test, bench, describe } from 'vitest';
import { Level } from 'level';
import { randomBytes } from 'crypto';

for (const fsync of [false]) {
  //   describe(`fsync=${fsync}`, () => {
  for (const dataSize of [1000, 10_000, 100_000]) {
    describe(`dataSize=${dataSize}`, () => {
      const data = randomBytes(dataSize).toString('hex');

      {
        let db: Level<string, string>;

        bench.skip(
          'individual inserts',
          async () => {
            for (let i = 0; i < 1000; i++) {
              await db.put('a' + i, data, { sync: fsync });
            }
          },
          {
            setup: async () => {
              db = new Level('/tmp/example' + Math.random(), { valueEncoding: 'utf8' });
            },
            teardown: async () => {
              await db.close();
            },
          },
        );
      }

      {
        let db: Level<string, string>;

        bench(
          'bulk inserts',
          async () => {
            const batch = db.batch();

            for (let i = 0; i < 1000; i++) {
              batch.put('a' + i, data);
            }

            await batch.write({ sync: fsync });
          },
          {
            setup: async () => {
              db = new Level('/tmp/example' + Math.random(), { valueEncoding: 'utf8' });
            },
            teardown: async () => {
              await db.close();
            },
          },
        );
      }
    });
  }
  //   });
}
