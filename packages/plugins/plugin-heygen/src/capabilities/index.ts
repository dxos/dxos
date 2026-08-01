//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import { Connector as ConnectorCapability, ConnectorEvents } from '@dxos/plugin-connector';
import { StudioCapabilities } from '@dxos/plugin-studio/types';

import { HeyGenEvents } from '../events';

export const Connector = Capability.lazyModule(
  'Connector',
  { provides: [ConnectorCapability], activatesOn: ConnectorEvents.Start },
  () => import('./connector'),
);
export const GenerationService = Capability.lazyModule(
  'GenerationService',
  { provides: [StudioCapabilities.GenerationService], activatesOn: HeyGenEvents.Start },
  () => import('./generation-service'),
);
