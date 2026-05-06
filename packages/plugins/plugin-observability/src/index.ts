//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const ObservabilityPlugin = Plugin.lazy(meta, () => import('./ObservabilityPlugin'));

export * from './meta';

export { ObservabilityCapabilities, ObservabilityEvents } from './types';
export * from './components';
