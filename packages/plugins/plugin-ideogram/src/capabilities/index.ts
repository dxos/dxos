//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';
import { StudioCapabilities } from '@dxos/plugin-studio/types';

export const Connector = Capability.lazyModule(
  'Connector',
  { provides: [ConnectorCapability], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./connector'),
);
export const GenerationService = Capability.lazyModule(
  'GenerationService',
  { provides: [StudioCapabilities.GenerationService], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./generation-service'),
);
