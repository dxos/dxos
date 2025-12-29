//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Settings = Capability.lazy('Settings', () => import('./settings'));

