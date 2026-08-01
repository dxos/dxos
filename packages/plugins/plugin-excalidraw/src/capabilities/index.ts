//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { IllustratorCapabilities } from '@dxos/plugin-illustrator/types';

import { ExcalidrawCapabilities, ExcalidrawEvents } from '#types';

export const DrawingVariant = Capability.lazyModule(
  'drawing-variant',
  { provides: [IllustratorCapabilities.VariantProvider], activatesOn: ExcalidrawEvents.Start },
  () => import('./drawing-variant'),
);

export const ExcalidrawSettings = AppCapability.settings(() => import('./settings'), {
  provides: [ExcalidrawCapabilities.Settings],
  activatesOn: ExcalidrawEvents.Start,
});

export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
