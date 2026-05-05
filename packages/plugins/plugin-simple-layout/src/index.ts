//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const SimpleLayoutPlugin = Plugin.lazy(meta, () => import('./SimpleLayoutPlugin'));

export * from './meta';
