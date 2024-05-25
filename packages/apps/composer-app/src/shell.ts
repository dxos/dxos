//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { runShell } from '@dxos/shell/react';
import { TRACE_PROCESSOR } from '@dxos/tracing';

import { setupConfig } from './config';

const main = async () => {
  TRACE_PROCESSOR.setInstanceTag('app');

  const config = await setupConfig();
  await runShell(config);
};

void main();
