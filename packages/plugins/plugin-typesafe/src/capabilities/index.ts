//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import { TypeSafeCapabilities } from '#types';

export const Connector = Capability.lazyModule(
  'Connector',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  () => import('./connector.ts'),
);

// Startup, not later: `AiService` snapshots its `AiModelResolver` contributions once during startup,
// so a resolver contributed in a later round is invisible to it.
export const ModelResolver = Capability.lazyModule(
  'ModelResolver',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [AppCapabilities.AiModelResolver],
    activatesOn: ActivationEvents.Startup,
  },
  () => import('./model-resolver.ts'),
);

export const SettingsModule = AppCapability.settings(() => import('./settings.ts'), {
  provides: [TypeSafeCapabilities.Settings],
});
