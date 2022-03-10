//
// Copyright 2022 DXOS.org
//

/* eslint-disable @typescript-eslint/no-var-requires */

const { createTestBroker } = require('@dxos/signal');

module.exports = async () => {
  await createTestBroker(12098);
};
