//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ReactSurface = Capability.lazy('BloggerReactSurface', () => import('./react-surface'));
