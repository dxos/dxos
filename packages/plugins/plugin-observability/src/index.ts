//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const ObservabilityPlugin = Plugin.lazy(meta, () => import('./ObservabilityPlugin'));

export { ObservabilityCapabilities, ObservabilityEvents } from './types';
export * from './components';
export { translations as observabilityTranslations } from './translations';
