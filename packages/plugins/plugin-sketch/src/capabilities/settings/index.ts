//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const SketchSettings = Capability.lazy('SketchSettings', () => import('./settings'));
