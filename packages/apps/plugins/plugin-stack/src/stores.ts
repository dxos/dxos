//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';

import { StackState } from './types';

// TODO(burdon): REMOVE GLOBAL VARIABLE!
export const stackState: StackState = deepSignal({
  creators: [],
  choosers: [],
});
