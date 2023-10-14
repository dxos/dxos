//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';

import { type StackState } from './types';

// TODO(burdon): REMOVE GLOBAL VARIABLE!
export const stackState: StackState = deepSignal({
  creators: [],
  choosers: [],
});
