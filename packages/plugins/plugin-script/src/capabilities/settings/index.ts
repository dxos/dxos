//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ScriptSettings = Capability.lazy('ScriptSettings', () => import('./settings'));
