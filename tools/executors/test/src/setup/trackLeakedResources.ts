//
// Copyright 2023 DXOS.org
//

import wtf from '../node-util/wtfnode';

type MochaHooks = {
  afterAll: () => Promise<void>;
};

export const mochaHooks: MochaHooks = {
  afterAll: async () => {
    console.log('Will check for leaks in 1000ms...');
    setTimeout(() => {
      (global as any).dxDumpLeaks?.();
      console.log('\n\n');
      wtf.dump();
    }, 1000);
  },
};
