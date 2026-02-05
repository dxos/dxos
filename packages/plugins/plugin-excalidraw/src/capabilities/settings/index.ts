//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ExcalidrawSettings = Capability.lazy('ExcalidrawSettings', () => import('./settings'));
