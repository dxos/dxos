//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const DeckPlugin = Plugin.lazy(meta, () => import('./DeckPlugin'));

export * from './meta';

export { DeckCapabilities, DeckEvents } from './types';
export { useCompanions } from './hooks';
