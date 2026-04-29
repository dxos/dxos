//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const AutomationPlugin = Plugin.lazy(meta, () => import('./AutomationPlugin'));
