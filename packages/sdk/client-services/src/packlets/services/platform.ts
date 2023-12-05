//
// Copyright 2022 DXOS.org
//

import { Platform } from '@dxos/protocols/proto/dxos/client/services';

export const getPlatform = (): Platform => {
  if ((process as any).browser) {
    if (typeof window !== 'undefined') {
      // Browser.
      const { userAgent } = window.navigator;
      return {
        type: Platform.PLATFORM_TYPE.BROWSER,
        userAgent,
        uptime: Math.floor((Date.now() - window.performance.timeOrigin) / 1_000),
      };
    } else {
      // Shared worker.
      return {
        type: Platform.PLATFORM_TYPE.SHARED_WORKER,
        uptime: Math.floor((Date.now() - performance.timeOrigin) / 1_000),
      };
    }
  } else {
    // Node.
    const { platform, version, arch } = process;
    return {
      type: Platform.PLATFORM_TYPE.NODE,
      platform,
      arch,
      runtime: version,
      uptime: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
    };
  }
};
