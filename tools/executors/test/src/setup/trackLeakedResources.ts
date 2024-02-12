//
// Copyright 2023 DXOS.org
//

import wtf from '../node-util/wtfnode';

type MochaHooks = {
  afterAll: () => Promise<void>;
};

export const mochaHooks: MochaHooks = {
  afterAll: async () => {
    const timeoutId = setTimeout(() => {
      console.log(
        "\n\n WARNING: It looks like the process didn't exit after running tests.\n Here are the open handles:\n",
      );

      (global as any).dxDumpLeaks?.();
      console.log('\n\n');
      wtf.dump();
    }, 1000);

    // Don't prevent the process from exiting.
    if (typeof timeoutId === 'object' && 'unref' in timeoutId) {
      timeoutId.unref();
    }
  },
};
