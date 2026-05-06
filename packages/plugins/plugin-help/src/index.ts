//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const HelpPlugin = Plugin.lazy(meta, () => import('./HelpPlugin'));

export * from './meta';

export { HelpCapabilities } from './types';
export * from './components';
export * from './constants';
export * from './hooks';
