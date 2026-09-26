//
// Copyright 2025 DXOS.org
//

import * as Trace from '@dxos/compute/Trace';
import { log } from '@dxos/log';

export const noopTraceWriter: Trace.Writer = Trace.noopWriter;

export const consoleTraceWriter: Trace.Writer = {
  write: (event, payload) => {
    log.info(event.key, payload as object);
  },
};
