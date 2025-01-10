//
// Copyright 2025 DXOS.org
//

import { defineEvent } from '@dxos/app-framework/next';

import { SPACE_PLUGIN } from './meta';

export namespace SpaceEvents {
  export const StateReady = defineEvent(`${SPACE_PLUGIN}/events/state-ready`);
}
