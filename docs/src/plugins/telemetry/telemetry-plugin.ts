//
// Copyright 2022 DXOS.org
//

import { resolve } from 'node:path';
import type { Plugin } from 'vuepress';

export const telemetryPlugin = (): Plugin => ({
  name: 'dxos-telemetry',
  clientConfigFile: resolve(__dirname, './client-config.ts')
});
