//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { runShell } from '@dxos/shell/react';

import { getConfig } from './config';
import { TRACE_PROCESSOR } from '@dxos/tracing';

const main = async () => {
  TRACE_PROCESSOR.setInstanceTag('shell');

  const config = await getConfig();
  await runShell(config);
};

void main();
