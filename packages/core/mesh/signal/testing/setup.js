//
// Copyright 2021 DXOS.org
//

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { runTestSignalServer } = require('@dxos/signal');

module.exports = {
  setup: async ({ port = 4000 }) => {
    await runTestSignalServer({ port, killExisting: true });
  },
};
