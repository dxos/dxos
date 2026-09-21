//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';

// Browser-only with the popover it serves: the resolver loads objects for a card no headless host renders.
export { LinkResolver } from './link-resolver.ts';

// Browser-only: the module mounts the popover itself, so its body is React all the way down.
export { PreviewPopover } from './preview-popover.ts';
export { ReactSurface } from './react-surface.ts';
export { Schema } from './schema.ts';
export const Translations = AppCapability.translations(translations);
