//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const MarkdownSettings = Capability.lazy('MarkdownSettings', () => import('./settings'));
