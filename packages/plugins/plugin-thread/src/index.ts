//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const ThreadPlugin = Plugin.lazy(meta, () => import('./ThreadPlugin'));

export * from './meta';

export { ThreadCapabilities } from './types';
export * from './calls';
// TODO(wittjosiah): Hooks should not be exported from the plugin package at all.
//   Either refactor callers to not need them or factor them out to a shared package.
export * from './hooks';
