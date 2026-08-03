//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';

import * as ExcalidrawCapabilities from '../types/ExcalidrawCapabilities';

export const DrawingVariant = Capability.lazyModule(
  'drawing-variant',
  { provides: [IllustratorCapabilities.VariantProvider], activatesOn: IllustratorEvents.Start },
  () => import('./drawing-variant'),
);

export const ExcalidrawSettings = AppCapability.settings(() => import('./settings'), {
  activatesOn: ActivationEvents.Idle,
  provides: [ExcalidrawCapabilities.Settings],
});

export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
