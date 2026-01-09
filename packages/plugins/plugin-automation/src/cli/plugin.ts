//
// Copyright 2025 DXOS.org
//

import { Common, Plugin } from '@dxos/app-framework';
import { ClientEvents } from '@dxos/plugin-client';

// NOTE: Must not import from index to avoid pulling in react dependencies.
import { ComputeRuntime } from '../capabilities/compute-runtime';
import { AutomationEvents } from '../events';
import { meta } from '../meta';

import { trigger } from './commands';

export const AutomationPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addCommandModule({
    commands: [trigger],
  }),
  Plugin.addModule({
    id: 'compute-runtime',
    activatesOn: ClientEvents.ClientReady,
    activatesAfter: [AutomationEvents.ComputeRuntimeReady],
    activate: ComputeRuntime,
  }),
  Plugin.make,
);
