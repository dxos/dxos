//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const ScriptPlugin = Plugin.lazy(meta, () => import('#plugin'));

export { ScriptCapabilities, ScriptEvents } from './types';
export * from './meta';
export * from './util';
