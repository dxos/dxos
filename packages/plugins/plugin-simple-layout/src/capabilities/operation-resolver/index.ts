//
// Copyright 2025 DXOS.org
//

import { type Capability, Capability as Capability$ } from '@dxos/app-framework';

export const OperationResolver: Capability.LazyCapability = Capability$.lazy(
  'OperationResolver',
  () => import('./operation-resolver'),
);
