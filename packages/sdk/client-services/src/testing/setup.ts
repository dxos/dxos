//
// Copyright 2024 DXOS.org
//

import { runTestSignalServer } from '@dxos/signal';

const port = 12004;

export default async () => {
  await runTestSignalServer({ port, killExisting: true });
};
