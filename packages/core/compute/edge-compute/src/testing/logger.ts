//
// Copyright 2025 DXOS.org
//

import * as Trace from '@dxos/compute/Trace';
import { log } from '@dxos/log';

export const noopTraceWriter: Trace.TraceWriter = Trace.noopWriter;

export const consoleTraceWriter: Trace.TraceWriter = {
  write: (event, payload) => {
    log.info(event.key, payload as object);
  },
};
