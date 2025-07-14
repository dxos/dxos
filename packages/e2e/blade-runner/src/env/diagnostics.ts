//
// Copyright 2024 DXOS.org
//

import { log } from '@dxos/log';
import { isNode } from '@dxos/util';

import { RESOURCE_USAGE_LOG, type ResourceUsageLogEntry } from '../analysys/resource-usage';

export const initDiagnostics = () => {
  // TODO(mykola): track diagnostics in browser.
  if (isNode()) {
    let prevCpuUsage = process.cpuUsage();

    log.trace(RESOURCE_USAGE_LOG, {
      ts: performance.now(),
    });

    const interval = setInterval(() => {
      const cpuUsage = process.cpuUsage(prevCpuUsage);
      prevCpuUsage = process.cpuUsage();

      const memoryUsage = process.memoryUsage();

      log.trace(RESOURCE_USAGE_LOG, {
        ts: performance.now(),
        cpu: cpuUsage,
        memory: memoryUsage,
      } satisfies ResourceUsageLogEntry);
    }, 200);

    return () => clearInterval(interval);
  }
};
