//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { initializeAppTelemetry } from '@braneframe/plugin-telemetry/headless';
import { Config, Defaults } from '@dxos/config';

import { startIFrameRuntime } from './iframe';
import { namespace } from './util';

void initializeAppTelemetry({ namespace, config: new Config(Defaults()) });
void startIFrameRuntime(
  () =>
    // NOTE: Url must be within SharedWorker instantiation for bundling to work as expected.
    new SharedWorker(new URL('./shared-worker', import.meta.url), {
      type: 'module',
      name: 'dxos-vault',
    }),
);
