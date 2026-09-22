//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';

import { translations } from '#translations';

// Browser-only: the variant supplies the React article that renders a drawing.
export const DrawingVariant = Capability.lazyModule(
  'drawing-variant',
  { provides: [IllustratorCapabilities.VariantProvider], activatesOn: IllustratorEvents.Start, environments: [] },
  () => import('./drawing-variant.ts'),
);
export const Translations = AppCapability.translations(translations);
