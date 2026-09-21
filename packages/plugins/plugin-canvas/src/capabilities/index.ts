//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';

// Browser-only: the variant supplies the React article that renders a drawing.
export { DrawingVariant } from './drawing-variant.ts';
export const Translations = AppCapability.translations(translations);
