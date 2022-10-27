//
// Copyright 2022 DXOS.org
//

import { inspect } from 'node:util';

import type { LogProcessor } from '../config';

export const DEBUG_PROCESSOR: LogProcessor = (config, entry) => {
  console.log(inspect(entry, false, null, true));
};
