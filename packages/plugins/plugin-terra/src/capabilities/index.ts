//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import * as TerraCapabilities from '../types/TerraCapabilities';

export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const PlanetCache = Capability.lazyModule(
  'PlanetCache',
  { provides: [TerraCapabilities.PlanetCache] },
  () => import('./planet-cache'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
