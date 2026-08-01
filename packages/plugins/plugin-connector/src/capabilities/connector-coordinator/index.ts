//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Coordinator = Capability.lazy('ConnectorCoordinator', () => import('./connector-coordinator'));
