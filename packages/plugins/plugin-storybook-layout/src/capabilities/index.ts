//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const IntentResolver = Capability.lazy('IntentResolver', () => import('./intent-resolver'));
export const State = Capability.lazy('State', () => import('./state'));

export { LayoutState } from './state';
