//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { SpaceCapability } from '@dxos/plugin-space';

import { TerraCapabilities } from '#types';

export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const PlanetCache = Capability.lazyModule(
  'PlanetCache',
  { provides: [TerraCapabilities.PlanetCache] },
  () => import('./planet-cache'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
