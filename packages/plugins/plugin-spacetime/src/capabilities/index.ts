//
// Copyright 2025 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { SpaceCapability } from '@dxos/plugin-space';

import { SpacetimeCapabilities, SpacetimeEvents } from '#types';

export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  activatesOn: SpacetimeEvents.Start,
});
export const SpacetimeSettings = AppCapability.settings(() => import('./settings'), {
  provides: [SpacetimeCapabilities.Settings],
  activatesOn: SpacetimeEvents.Start,
});
