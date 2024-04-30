//
// Copyright 2021 DXOS.org
//

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runTestSignalServer } = require('@dxos/signal');

const ENV_TEST_SIGNAL_PORT = process.env.TEST_SIGNAL_PORT;

export default async function globalSetup() {
  const port = ENV_TEST_SIGNAL_PORT ? parseInt(ENV_TEST_SIGNAL_PORT) : 4000;
  await runTestSignalServer({ port, killExisting: true });
}
