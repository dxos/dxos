//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const IntentResolvers = Capability.lazy('IntentResolvers', () => import('./intent-resolver'));
