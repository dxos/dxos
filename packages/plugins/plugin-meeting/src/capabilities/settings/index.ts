//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const MeetingSettings = Capability.lazy('MeetingSettings', () => import('./settings'));
