//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const MeetingState = Capability.lazy('MeetingState', () => import('./state'));

