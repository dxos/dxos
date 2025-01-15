//
// Copyright 2025 DXOS.org
//

import { defineEvent } from '@dxos/app-framework';

import { SPACE_PLUGIN } from './meta';

export namespace SpaceEvents {
  export const StateReady = defineEvent(`${SPACE_PLUGIN}/event/state-ready`);
  export const DefaultSpaceReady = defineEvent(`${SPACE_PLUGIN}/event/default-space-ready`);
}
