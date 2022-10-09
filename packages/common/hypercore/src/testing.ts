//
// Copyright 2019 DXOS.org
//

// @dxos/mocha platform=nodejs

import faker from 'faker';

// TODO(burdon): Replace with proto.
export type TestDataItem = { id: number, text: string }

export const createDataItem = (n: number): TestDataItem => ({
  id: n,
  text: faker.lorem.sentence()
});

// TODO(burdon): Move to async.
export const setRandomInterval = (cb: (i: number) => boolean, min = 0, max = 100) => {
  let i = 0;
  let running = true;
  const f = () => {
    setTimeout(() => {
      if (running) {
        if (cb(i++)) {
          f();
        }
      }
    }, faker.datatype.number({ min, max }));
  };

  f();

  return () => {
    running = false;
  };
};
