//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ThreadSettings = Capability.lazy('ThreadSettings', () => import('./settings'));
