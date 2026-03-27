//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const MarkdownExtension = Capability.lazy('MarkdownExtension', () => import('./markdown'));
