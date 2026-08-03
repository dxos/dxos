//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as StudioCapabilities from '@dxos/plugin-studio/StudioCapabilities';
import * as StudioEvents from '@dxos/plugin-studio/StudioEvents';

export const Connector = Capability.lazyModule(
  'Connector',
  { provides: [ConnectorCapability], activatesOn: ConnectorEvents.Start },
  () => import('./connector'),
);
export const GenerationService = Capability.lazyModule(
  'GenerationService',
  { provides: [StudioCapabilities.GenerationService], activatesOn: StudioEvents.Start },
  () => import('./generation-service'),
);
