//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const SettingsOperationResolver = Capability.lazy(
  'SettingsOperationResolver',
  () => import('./operation-resolver'),
);
