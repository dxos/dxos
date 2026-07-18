//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import { type GenerationService as GenerationServiceContract, StudioCapabilities } from '@dxos/plugin-studio/types';

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
