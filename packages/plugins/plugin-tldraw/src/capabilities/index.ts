//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { IllustratorCapabilities } from '@dxos/plugin-illustrator/types';

import { TldrawCapabilities, TldrawEvents } from '#types';

export const DrawingVariant = Capability.lazyModule(
  'drawing-variant',
  { provides: [IllustratorCapabilities.VariantProvider], activatesOn: TldrawEvents.Start },
  () => import('./drawing-variant'),
);

export const TldrawSettings = AppCapability.settings(() => import('./settings'), {
  provides: [TldrawCapabilities.Settings],
  activatesOn: TldrawEvents.Start,
});
