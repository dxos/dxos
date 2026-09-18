//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import { TypeSafeCapabilities } from '#types';

export const Connector = Capability.lazyModule(
  'Connector',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  () => import('./connector.ts'),
);

export const LayerSpecs = AppCapability.layerSpec(() => import('./layer-specs.ts'), {
  name: 'DecisionModel',
  requires: [TypeSafeCapabilities.Settings, Capabilities.AtomRegistry],
});

export const SettingsModule = AppCapability.settings(() => import('./settings.ts'), {
  provides: [TypeSafeCapabilities.Settings],
});
