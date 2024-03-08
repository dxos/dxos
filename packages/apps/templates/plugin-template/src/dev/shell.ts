//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { runShell } from '@dxos/shell/react';
import { createConfig } from './config';

createConfig().then(runShell);

