//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import { AbstractValueEncoding } from 'hypercore';

import { sleep } from '@dxos/async';
import { Codec } from '@dxos/codec-protobuf';
import { createCodecEncoding } from '@dxos/hypercore';

import { FeedWriter } from '../feed-writer';

type TestItem = {
  key: string
  value: string
}

const defaultCodec: Codec<TestItem> = {
  encode: (obj: TestItem) => Buffer.from(JSON.stringify(obj)),
  decode: (buffer: Uint8Array) => JSON.parse(buffer.toString())
};

export const defaultValueEncoding: AbstractValueEncoding<TestItem> = createCodecEncoding(defaultCodec);

export type TestBlockGenerator<T extends {}> = (i: number) => T

export const defaultTestBlockGenerator: TestBlockGenerator<TestItem> = () => ({
  key: faker.datatype.uuid(),
  value: faker.lorem.sentence()
});

/**
 * Writes data to feeds.
 */
// TODO(burdon): Use in other tests.
export class TestGenerator<T = {}> {
  _count = 0;

  constructor (
    private readonly _generate: TestBlockGenerator<T>
  ) {}

  async writeBlocks (writer: FeedWriter<T>, {
    count = 1,
    delay
  }: {
    count?: number
    delay?: {
      min: number
      max: number
    }
  } = {}) {
    for (const _ of Array.from(Array(count))) {
      const data = this._generate(this._count++);
      await writer.append(data);
      if (delay) {
        await sleep(faker.datatype.number(delay));
      }
    }

    return count;
  }
}

export const defaultTestGenerator = new TestGenerator<TestItem>(defaultTestBlockGenerator);
