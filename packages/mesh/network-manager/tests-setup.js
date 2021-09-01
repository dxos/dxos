const { createTestBroker } = require('@dxos/signal');

module.exports = async () => {
  await createTestBroker(12098);
};
