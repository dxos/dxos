//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { MeetingCapabilities } from './capabilities';

export default () => {
  const state = live<MeetingCapabilities.State>({});
  return contributes(MeetingCapabilities.State, state);
};
