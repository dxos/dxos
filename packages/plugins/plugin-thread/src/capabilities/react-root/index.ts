//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ReactRoot = Capability.lazy('ReactRoot', () => import('./react-root'));

