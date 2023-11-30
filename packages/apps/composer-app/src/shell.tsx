//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { runShell } from '@dxos/shell/react';

import { setupConfig } from './config';

const main = async () => {
  const config = await setupConfig();
  await runShell(config);
};

void main();
