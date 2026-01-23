//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const PresenterSettings = Capability.lazy('PresenterSettings', () => import('./settings'));
