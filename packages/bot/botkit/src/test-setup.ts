//
// Copyright 2021 DXOS.org
//

import { randomBytes } from '@dxos/crypto';
import { createBroker } from '@dxos/signal';

export const TEST_SIGNAL_URL = 'http://localhost:4000';

let signalServer: ReturnType<typeof createBroker>;

before(async () => {
  signalServer = createBroker(randomBytes(), { logLevel: 'warn', hyperswarm: { bootstrap: false } });
  await signalServer.start();
});

after(async () => {
  await signalServer.stop();
});
