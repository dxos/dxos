//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import { AbstractValueEncoding } from 'hypercore';

import { sleep } from '@dxos/async';
import { Codec } from '@dxos/codec-protobuf';
import { createCodecEncoding } from '@dxos/hypercore';
import { schema } from '@dxos/protocols';
import { TestItemMutation } from '@dxos/protocols/proto/example/testing/data';

import { FeedWriter } from '../feed-writer';

export const defaultCodec: Codec<TestItemMutation> = schema.getCodecForType('example.testing.data.TestItemMutation');

export const defaultValueEncoding: AbstractValueEncoding<TestItemMutation> = createCodecEncoding(defaultCodec);

export type TestBlockGenerator<T extends {}> = (i: number) => T

export const defaultTestBlockGenerator: TestBlockGenerator<TestItemMutation> = () => ({
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

export const defaultTestGenerator = new TestGenerator<TestItemMutation>(defaultTestBlockGenerator);
