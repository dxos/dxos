//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { runShell } from '@dxos/shell/react';

import { createConfig } from './config';

// eslint-disable-next-line no-console
createConfig().then(runShell).catch(console.error);
