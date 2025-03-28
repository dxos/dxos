//
// Copyright 2025 DXOS.org
//

import { Events } from '@dxos/app-framework';

import { THREAD_PLUGIN } from './meta';

export namespace ThreadEvents {
  export const SetupActivity = Events.createStateEvent(`${THREAD_PLUGIN}/setup-activity`);
}
