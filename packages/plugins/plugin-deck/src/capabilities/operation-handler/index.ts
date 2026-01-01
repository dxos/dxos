//
// Copyright 2025 DXOS.org
//

import { type Capability, Capability as Capability$ } from '@dxos/app-framework';

export const LayoutOperationHandler: Capability.LazyCapability = Capability$.lazy(
  'LayoutOperationHandler',
  () => import('./operation-handler'),
);
