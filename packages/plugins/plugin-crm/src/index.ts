//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const CrmPlugin = Plugin.lazy(meta, () => import('./CrmPlugin'));

export * from './blueprints';
export * from './operations';
export * from './sources';
export * from './types';
