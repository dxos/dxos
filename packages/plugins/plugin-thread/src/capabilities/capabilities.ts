//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type DeepReadonly } from '@dxos/util';

import { THREAD_PLUGIN } from '../meta';
import { type ViewState, type ThreadState } from '../types';

export namespace ThreadCapabilities {
  type GetViewState = (subjectId: string) => ViewState;
  export const State = defineCapability<{ state: DeepReadonly<ThreadState>; getViewState: GetViewState }>(
    `${THREAD_PLUGIN}/capability/state`,
  );
  export const MutableState = defineCapability<{ state: ThreadState; getViewState: GetViewState }>(
    `${THREAD_PLUGIN}/capability/state`,
  );
}
