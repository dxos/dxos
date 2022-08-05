//
// Copyright 2022 DXOS.org
//

/* eslint-disable @typescript-eslint/no-var-requires */

const { createTestBroker } = require('@dxos/signal');

module.exports = () => {
  createTestBroker(12098);
};
