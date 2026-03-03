//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const MarkdownState = Capability.lazy('MarkdownState', () => import('./state'));
