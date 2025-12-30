//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Updater = Capability.lazy('Updater', () => import('./updater'));
