//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const HelpPlugin = Plugin.lazy(meta, () => import('./HelpPlugin'));

export { HelpCapabilities } from './types';
export * from './components';
export * from './constants';
export * from './hooks';
export * from './types';
