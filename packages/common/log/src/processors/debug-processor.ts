//
// Copyright 2022 DXOS.org
//

import { inspect } from 'util';

import type { LogProcessor } from '../config.js';

export const DEBUG_PROCESSOR: LogProcessor = (config, entry) => {
  console.log(inspect(entry, false, null, true));
};
