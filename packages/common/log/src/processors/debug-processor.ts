//
// Copyright 2022 DXOS.org
//

import { inspect } from 'util';

import type { LogProcessor } from '../log';

export const DEBUG_PROCESSOR: LogProcessor = entry => {
  console.log(inspect(entry, false, null, true));
};
