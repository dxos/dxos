//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { MeetingCapabilities } from '../../types';

export default Capability.makeModule(() => {
  const state = live<MeetingCapabilities.State>({});
  return Capability.contributes(MeetingCapabilities.State, state);
});
