//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const IntegrationPlugin = Plugin.lazy(meta, () => import('./IntegrationPlugin'));

export * from './meta';
