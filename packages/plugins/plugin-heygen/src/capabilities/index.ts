//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';
import { StudioCapabilities } from '@dxos/plugin-studio/types';

export const Connector = Capability.lazyModule(
  'Connector',
  { provides: [ConnectorCapability] },
  () => import('./connector'),
);
export const GenerationService = Capability.lazyModule(
  'GenerationService',
  { provides: [StudioCapabilities.GenerationService] },
  () => import('./generation-service'),
);
