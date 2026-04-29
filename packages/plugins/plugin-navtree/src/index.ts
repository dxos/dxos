//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const NavTreePlugin = Plugin.lazy(meta, () => import('./NavTreePlugin'));

export { NavTreeCapabilities, NavTreeEvents } from './types';
export * from './util';
