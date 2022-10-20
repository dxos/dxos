//
// Copyright 2021 DXOS.org
//

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createTestBroker } = require('@dxos/signal');

module.exports = {
  setup: async () => {
    await createTestBroker(4000);
  }
};
