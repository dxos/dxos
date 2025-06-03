//
// Copyright 2025 DXOS.org
//

import { defineEvent, Events } from '@dxos/app-framework';

import { THREAD_PLUGIN } from './meta';

export namespace ThreadEvents {
  export const SetupThread = defineEvent(`${THREAD_PLUGIN}/event/setup-thread`);
  // TODO(wittjosiah): Remove?
  export const SetupActivity = Events.createStateEvent(`${THREAD_PLUGIN}/setup-activity`);
}
