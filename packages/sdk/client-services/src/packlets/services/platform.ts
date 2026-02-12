//
// Copyright 2022 DXOS.org
//

import { create } from '@dxos/protocols/buf';
import { type Platform, PlatformSchema, Platform_PLATFORM_TYPE } from '@dxos/protocols/buf/dxos/client/services_pb';

export const getPlatform = (): Platform => {
  if ((process as any).browser) {
    if (typeof window !== 'undefined') {
      // Browser.
      const { userAgent } = window.navigator;
      return create(PlatformSchema, {
        type: Platform_PLATFORM_TYPE.BROWSER,
        userAgent,
        uptime: Math.floor((Date.now() - window.performance.timeOrigin) / 1_000),
      });
    } else {
      // Shared worker.
      return create(PlatformSchema, {
        type: Platform_PLATFORM_TYPE.SHARED_WORKER,
        uptime: Math.floor((Date.now() - performance.timeOrigin) / 1_000),
      });
    }
  } else {
    // Node.
    const { platform, version, arch } = process;
    const memoryUsage = process.memoryUsage();
    return create(PlatformSchema, {
      type: Platform_PLATFORM_TYPE.NODE,
      platform,
      arch,
      runtime: version,
      uptime: Math.floor(process.uptime()),
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers,
      },
    });
  }
};
