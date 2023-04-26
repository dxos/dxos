//
// Copyright 2021 DXOS.org
//

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runTestSignalServer } = require('@dxos/signal');

module.exports = {
  setup: async () => {
    await runTestSignalServer(4000);
  }
};
