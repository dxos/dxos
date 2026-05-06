//
// Copyright 2024 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const SettingsPlugin = Plugin.lazy(meta, () => import('./SettingsPlugin'));

export * from './meta';

export * from './actions';
