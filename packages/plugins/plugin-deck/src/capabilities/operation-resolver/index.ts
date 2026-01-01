//
// Copyright 2025 DXOS.org
//

import { type Capability, Capability as Capability$ } from '@dxos/app-framework';

export const LayoutOperationResolver: Capability.LazyCapability = Capability$.lazy(
  'LayoutOperationResolver',
  () => import('./operation-resolver'),
);
