//
// Copyright 2021 DXOS.org
//

/* eslint @typescript-eslint/no-var-requires: 0 */

const { createTestBroker } = require('@dxos/signal');

module.exports = async () => {
  await createTestBroker(4000);
};
