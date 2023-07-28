//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';

import { StackState } from './types';

export const stackState: StackState = deepSignal({
  creators: [],
  choosers: [],
});
