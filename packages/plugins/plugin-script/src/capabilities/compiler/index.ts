//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Compiler = Capability.lazy('Compiler', () => import('./compiler'));

