//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { IllustratorCapabilities } from '@dxos/plugin-illustrator/types';

import { ExcalidrawCapabilities } from '#types';

export const DrawingVariant = Capability.lazyModule(
  'drawing-variant',
  { provides: [IllustratorCapabilities.VariantProvider] },
  () => import('./drawing-variant'),
);

export const ExcalidrawSettings = AppCapability.settings(() => import('./settings'), {
  provides: [ExcalidrawCapabilities.Settings],
});

export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
