//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { SpacetimeCapabilities } from '#types';

export const CreateObject = Capability.lazyModule(
  'CreateObject',
  { provides: [SpaceCapabilities.CreateObjectEntry] },
  () => import('./create-object'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
export const SpacetimeSettings = Capability.lazyModule(
  'SpacetimeSettings',
  { provides: [AppCapabilities.Settings, SpacetimeCapabilities.Settings] },
  () => import('./settings'),
);
