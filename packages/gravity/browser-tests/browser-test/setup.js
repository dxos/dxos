//
// Copyright 2021 DXOS.org
//

/* eslint @typescript-eslint/no-var-requires: 0 */

const { randomBytes } = require('@dxos/crypto');
const { createBroker } = require('@dxos/signal');

module.exports = async () => {
  const topic = randomBytes();

  await createBroker(topic, { logLevel: 'warn', hyperswarm: { bootstrap: false } }).start();
};
