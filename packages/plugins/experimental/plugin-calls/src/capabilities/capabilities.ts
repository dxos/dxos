//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';

import { type CallManager } from '../call';
import { CALLS_PLUGIN } from '../meta';

export namespace CallCapabilities {
  export const Call = defineCapability<CallManager>(`${CALLS_PLUGIN}/capability/call`);
}
