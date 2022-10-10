//
// Copyright 2021 DXOS.org
//

module.exports = {
  setup: async () => {
    const { createTestBroker } = await import('@dxos/signal');
    await createTestBroker(4000);
  }
};
