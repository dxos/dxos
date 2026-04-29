//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const AssistantPlugin = Plugin.lazy(meta, () => import('./AssistantPlugin'));

export * from './blueprints';
export * from './components';
export * from './hooks';
export * from './translations';
export * from './types';
