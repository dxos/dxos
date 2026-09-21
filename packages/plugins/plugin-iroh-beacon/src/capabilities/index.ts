//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';

export { BeaconServiceModule } from './beacon-service.ts';

export { ReactSurface } from './react-surface.ts';
export const Translations = AppCapability.translations(translations);
