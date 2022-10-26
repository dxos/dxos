//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import { AbstractValueEncoding } from 'hypercore';

import { sleep } from '@dxos/async';
import { Codec } from '@dxos/codec-protobuf';
import { createCodecEncoding } from '@dxos/hypercore';

import { FeedWriter } from '../feed-writer';

export type TestItem = {
  id: string;
  index: number;
  value: string;
};

export const defaultCodec: Codec<any> = {
  encode: (obj: any) => Buffer.from(JSON.stringify(obj)),
  decode: (buffer: Uint8Array) => JSON.parse(buffer.toString())
};

export const defaultValueEncoding: AbstractValueEncoding<any> = createCodecEncoding(defaultCodec);

export type TestBlockGenerator<T> = (i: number) => T;

export const defaultTestBlockGenerator: TestBlockGenerator<TestItem> = (i) => ({
  id: faker.datatype.uuid(),
  index: i,
  value: faker.lorem.sentence()
});

/**
 * Writes data to feeds.
 */
export class TestGenerator<T extends {}> {
  _count = 0;

  constructor(private readonly _generate: TestBlockGenerator<T>) {}

  async writeBlocks(
    writer: FeedWriter<T>,
    {
      count = 1,
      delay
    }: {
      count?: number;
      delay?: {
        min: number;
        max: number;
      };
    } = {}
  ) {
    return await Promise.all(
      Array.from(Array(count)).map(async () => {
        const data = this._generate(this._count++);
        const receipt = await writer.write(data);
        if (delay) {
          await sleep(faker.datatype.number(delay));
        }

        return receipt;
      })
    );
  }
}

export const defaultTestGenerator = new TestGenerator<TestItem>(defaultTestBlockGenerator);
