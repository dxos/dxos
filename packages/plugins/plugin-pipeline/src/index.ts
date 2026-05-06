//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const PipelinePlugin = Plugin.lazy(meta, () => import('./PipelinePlugin'));

export * from './meta';
