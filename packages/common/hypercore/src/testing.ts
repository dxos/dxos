//
// Copyright 2019 DXOS.org
//

import { faker } from '@dxos/random';

export const noop = () => {};

// TODO(burdon): Replace with proto def.
export type TestDataItem = { id: number; text: string };

export const createDataItem = (n: number): TestDataItem => ({
  id: n,
  text: faker.lorem.sentence(),
});

type BatchCallback = (next: (num: number) => void, index: number, remaining: number) => void;

// TODO(burdon): Factor out.
export const batch = (cb: BatchCallback, total: number) => {
  let i = 0;
  const f = () => {
    const remaining = total - i;
    cb(
      (num = 1) => {
        i += num;
        if (i < total) {
          f();
        }
      },
      i,
      remaining,
    );
  };

  f();
};
