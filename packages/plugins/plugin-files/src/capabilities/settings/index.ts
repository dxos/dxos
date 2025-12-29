//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const FileSettings = Capability.lazy('FileSettings', () => import('./settings'));

