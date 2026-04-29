//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const FilesPlugin = Plugin.lazy(meta, () => import('./FilesPlugin'));

export { FileCapabilities } from './types';
export * from './types';
