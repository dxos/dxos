//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const SheetPlugin = Plugin.lazy(meta, () => import('./SheetPlugin'));

export { SheetCapabilities } from './types';
