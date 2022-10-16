//
// Copyright 2022 DXOS.org
//

import faker from 'faker';

import { sleep } from '@dxos/async';

import { FeedWriter } from '../feed-writer';

export type GenerateItem<T> = (i: number) => T

export const defaultGenerator: GenerateItem<string> = (i) => `test-${i}`;

/**
 * Writes data to feeds.
 */
// TODO(burdon): Use in other tests.
export class TestGenerator<T> {
  _count = 0;

  constructor (
    private readonly _generate: GenerateItem<T>
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
