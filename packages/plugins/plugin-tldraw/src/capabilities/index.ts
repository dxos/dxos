//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { IllustratorCapabilities, IllustratorEvents } from '@dxos/plugin-illustrator/types';

import { TldrawCapabilities } from '#types';

export const DrawingVariant = Capability.lazyModule(
  'drawing-variant',
  { provides: [IllustratorCapabilities.VariantProvider], activatesOn: IllustratorEvents.Start },
  () => import('./drawing-variant'),
);

export const TldrawSettings = AppCapability.settings(() => import('./settings'), {
  provides: [TldrawCapabilities.Settings],
});
