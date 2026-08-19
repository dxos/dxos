//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { PreviewEvents } from '../events';
import type { PreviewPluginOptions } from '../types';

export const PreviewPopover = Capability.lazyModule(
  'PreviewPopover',
  { provides: [], activatesOn: PreviewEvents.Start },
  () => import('./preview-popover'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.cardContent'],
});
export const Schema = AppCapability.schema(() => import('./schema'));
/**
 * Separate from {@link ReactSurface} so the `article` role gate loads only this stand-in — a build
 * that ships every plugin never renders it, and one that does not should not pay for the card
 * surfaces to find that out.
 */
export const UnsupportedTypeSurface = AppCapability.surface(() => import('./unsupported-type-surface'), {
  roles: ['org.dxos.role.article'],
  props: ({ extensibleAppUrl }: PreviewPluginOptions) => ({ extensibleAppUrl }),
});
