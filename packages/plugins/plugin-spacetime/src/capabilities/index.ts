//
// Copyright 2025 DXOS.org
//

import { AppCapability } from '@dxos/app-toolkit';
import { SpaceCapability } from '@dxos/plugin-space';

import { SpacetimeCapabilities } from '#types';

export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const SpacetimeSettings = AppCapability.settings(() => import('./settings'), {
  provides: [SpacetimeCapabilities.Settings],
});
