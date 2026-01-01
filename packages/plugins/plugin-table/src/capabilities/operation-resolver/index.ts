//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const OperationResolver = Capability.lazy('OperationResolver', () => import('./operation-resolver'));

