//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';

// Browser-only: the variant supplies the React article/card components that render a drawing.
export { DrawingVariant } from './drawing-variant.ts';

export { ExcalidrawSettings } from './settings.ts';

export { ReactSurface } from './react-surface.ts';
export const Translations = AppCapability.translations(translations);
