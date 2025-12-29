//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const DeckState = Capability.lazy('DeckState', () => import('./state'));
export { DeckStateFactory } from './state';

