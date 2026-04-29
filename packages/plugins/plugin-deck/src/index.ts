//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const DeckPlugin = Plugin.lazy(meta, () => import('./DeckPlugin'));

export { DeckCapabilities, DeckEvents } from './types';
export { useCompanions } from './hooks';
