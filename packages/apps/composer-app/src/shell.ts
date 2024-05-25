//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { runShell } from '@dxos/shell/react';

import { setupConfig } from './config';
import { TRACE_PROCESSOR } from '@dxos/tracing';

const main = async () => {
  TRACE_PROCESSOR.setInstanceTag('app');

  const config = await setupConfig();
  await runShell(config);
};

void main();
