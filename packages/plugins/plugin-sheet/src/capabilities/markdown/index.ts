//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Markdown = Capability.lazy('Markdown', () => import('./markdown'));
