//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const IdentityCreated = Capability.lazy('IdentityCreated', () => import('./identity-created'));
