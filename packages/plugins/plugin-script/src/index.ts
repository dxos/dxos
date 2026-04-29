//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const ScriptPlugin = Plugin.lazy(meta, () => import('./ScriptPlugin'));

export { ScriptCapabilities, ScriptEvents } from './types';
export * from './components';
export * from './containers';
export * from './util';
