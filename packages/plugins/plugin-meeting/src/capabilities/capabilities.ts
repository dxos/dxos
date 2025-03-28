//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';

import { MEETING_PLUGIN } from '../meta';
import { type CallManager } from '../state';

export namespace MeetingCapabilities {
  export const CallManager = defineCapability<CallManager>(`${MEETING_PLUGIN}/capability/call-manager`);
}
