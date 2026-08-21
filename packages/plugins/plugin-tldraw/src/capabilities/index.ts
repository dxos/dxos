//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';

import { TldrawCapabilities } from '#types';

// Browser-only: the variant supplies the React article/card components that render a drawing.
export const DrawingVariant = Capability.lazyModule(
  'drawing-variant',
  { provides: [IllustratorCapabilities.VariantProvider], activatesOn: IllustratorEvents.Start, environments: [] },
  () => import('./drawing-variant'),
);

export const TldrawSettings = AppCapability.settings(() => import('./settings'), {
  activatesOn: ActivationEvents.Idle,
  provides: [TldrawCapabilities.Settings],
});
