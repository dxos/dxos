//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const DeckPlugin = Plugin.lazy(meta, () => import('./DeckPlugin'));

export * from './meta';

export { DeckCapabilities, DeckEvents } from './types';
// TODO(wittjosiah): Hooks should not be exported from the plugin package at all.
//   Either refactor callers to not need them or factor them out to a shared package.
export { useCompanions } from './hooks';
