//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { runShell } from '@dxos/shell/react';
import { TRACE_PROCESSOR } from '@dxos/tracing';

import { getConfig } from './config';

const main = async () => {
  TRACE_PROCESSOR.setInstanceTag('shell');

  const config = await getConfig();
  await runShell(config);
};

void main();
