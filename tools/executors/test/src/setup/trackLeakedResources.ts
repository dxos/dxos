//
// Copyright 2023 DXOS.org
//

import wtf from 'wtfnode';

type MochaHooks = {
  afterAll: () => Promise<void>;
};

export const mochaHooks: MochaHooks = {
  afterAll: async () => {
    setTimeout(() => {
      (global as any).dxDumpLeaks?.();
      console.log('\n\n');
      wtf.dump();
    }, 1000);
  }
};
