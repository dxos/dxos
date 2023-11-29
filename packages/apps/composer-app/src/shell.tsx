//
// Copyright 2023 DXOS.org
//

import '@dxos/shell/style.css';
import { runShell } from '@dxos/shell';

import { setupConfig } from './config';

const main = async () => {
  const config = await setupConfig();
  await runShell(config);
};

void main();
