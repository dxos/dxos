//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ReactContext = Capability.lazy('ReactContext', () => import('./react-context'));
