//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const NavTreePlugin = Plugin.lazy(meta, () => import('./NavTreePlugin'));

export * from './meta';

export { NavTreeCapabilities, NavTreeEvents } from './types';
export * from './util';
