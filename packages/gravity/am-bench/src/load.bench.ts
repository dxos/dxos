import { beforeAll, bench } from 'vitest';
import * as Automerge from '@automerge/automerge';
import { randomBytes } from 'node:crypto';

let COUNT = 100;

const docs: Uint8Array[] = [];

const randomString = (length: number) =>
  randomBytes(length / 2 + 1)
    .toString('hex')
    .slice(0, length);

beforeAll(() => {
  for (let i = 0; i < COUNT; i++) {
    const doc = Automerge.from({
      author: randomString(10),
      content: randomString(200),
    });
    docs.push(Automerge.save(doc));
    Automerge.free(doc);
  }
});

bench(
  'load',
  () => {
    for (const doc of docs) {
      const loaded = Automerge.load(doc);
      Automerge.free(loaded);
    }
  },
  { time: 5_000 },
);
