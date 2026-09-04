//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';

import { PreviewEvents } from '../events';

// Browser-only: the module mounts the popover itself, so its body is React all the way down.
export const PreviewPopover = Capability.lazyModule(
  'PreviewPopover',
  { provides: [], activatesOn: PreviewEvents.Start, environments: [] },
  () => import('./preview-popover'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.cardContent', 'org.dxos.role.article'],
});
export const Schema = AppCapability.schema(() => import('./schema'));
export const Translations = AppCapability.translations(translations);
