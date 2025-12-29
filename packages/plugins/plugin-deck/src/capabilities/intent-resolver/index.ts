//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const LayoutIntentResolver = Capability.lazy('LayoutIntentResolver', () => import('./intent-resolver'));

