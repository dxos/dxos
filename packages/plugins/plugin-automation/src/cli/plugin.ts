//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client/types';

// NOTE: Must not import from index to avoid pulling in react dependencies.
import { ComputeRuntime } from '../capabilities/compute-runtime';
import { meta } from '../meta';
import { AutomationEvents } from '../types';

import { trigger } from './commands';

export const AutomationPlugin = Plugin.define(meta).pipe(
  AppPlugin.addCommandModule({ commands: [trigger] }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    activatesAfter: [AutomationEvents.ComputeRuntimeReady],
    activate: ComputeRuntime,
  }),
  Plugin.make,
);
