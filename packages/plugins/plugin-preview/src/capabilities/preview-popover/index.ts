//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const PreviewPopover = Capability.lazy('PreviewPopover', () => import('./preview-popover'));
