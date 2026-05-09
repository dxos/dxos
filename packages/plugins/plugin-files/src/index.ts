//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const FilesPlugin = Plugin.lazy(meta, () => import('#plugin'));

export * from './meta';

export { FileCapabilities } from './types';
export * from './types';
