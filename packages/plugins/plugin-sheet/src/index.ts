//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const SheetPlugin = Plugin.lazy(meta, () => import('./SheetPlugin'));

export * from './meta';

export { SheetCapabilities } from './types';
