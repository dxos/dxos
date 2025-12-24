//
// Copyright 2025 DXOS.org
//

import { contributes, defineCapabilityModule } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { MeetingCapabilities } from './capabilities';

export default defineCapabilityModule(() => {
  const state = live<MeetingCapabilities.State>({});
  return contributes(MeetingCapabilities.State, state);
});
