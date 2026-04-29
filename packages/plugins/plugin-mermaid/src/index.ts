//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const MermaidPlugin = Plugin.lazy(meta, () => import('./MermaidPlugin'));
