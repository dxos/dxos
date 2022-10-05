//
// Copyright 2022 DXOS.org
//

import faker from 'faker';

import { PublicKey } from '@dxos/keys';

import { Spy } from '../client';
import { Command } from '../common';

const keys = [
  'c5c0b3b2c174ad3306d7a2c2f8b0df1698eba0ef6b86070cfae730f68c8fefc2',
  'f7d45e653845b56f881fe8c7e1f5901228472c4e94ca05a3ae741df786f5bd43',
  '42dfc7a06a5b036a1157b46edde2f40d1f393d4ec86f5d4a71813a1dee197126',
  'f3cc97bc983c633e1c72b1c0c3f0503e30ad38e4db353080a0c1698680507f77',
  'f607c12ac66fb8a8c03ec84a727cf98fb8031441d3b6c47a3ea0c3ec6dec7575'
];

const spy = new Spy();

let cmd: Command = Command.LOG;
if (process.argv.some(arg => arg === '--clear')) {
  cmd = Command.CLEAR;
}
if (process.argv.some(arg => arg === '--mark')) {
  cmd = Command.MARK;
}

switch (cmd) {
  case Command.CLEAR: {
    void spy.clear();
    break;
  }

  case Command.MARK: {
    void spy.mark(spy.humanize(PublicKey.random()));
    break;
  }

  case Command.LOG:
  default: {
    const init = async () => {
      const key = PublicKey.from(faker.random.arrayElement(keys));
      await spy.log(key, {
        num: faker.datatype.number(),
        text: faker.lorem.paragraph()
      });

      if (faker.datatype.boolean()) {
        const a = {};
        spy.bind2(key, a);

        await spy.log(a, {
          num: faker.datatype.number()
        });
      }
    };

    void init();
  }
}
