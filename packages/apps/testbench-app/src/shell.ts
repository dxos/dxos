//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { runShell } from '@dxos/shell/react';

import { getConfig } from './config';

const main = async () => {
  const config = await getConfig();
  await runShell(config);
};

void main();
