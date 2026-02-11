//
// Copyright 2022 DXOS.org
//

import { create } from '@dxos/protocols/buf';
import { type Platform, PlatformSchema, Platform_Type } from '@dxos/protocols/buf/dxos/client/services_pb';

export const getPlatform = (): Platform => {
  if ((process as any).browser) {
    if (typeof window !== 'undefined') {
      // Browser.
      const { userAgent } = window.navigator;
      return create(PlatformSchema, {
        type: Platform_Type.BROWSER,
        userAgent,
        uptime: BigInt(Math.floor((Date.now() - window.performance.timeOrigin) / 1_000)),
      });
    } else {
      // Shared worker.
      return create(PlatformSchema, {
        type: Platform_Type.SHARED_WORKER,
        uptime: BigInt(Math.floor((Date.now() - performance.timeOrigin) / 1_000)),
      });
    }
  } else {
    // Node.
    const { platform, version, arch } = process;
    const memoryUsage = process.memoryUsage();
    return create(PlatformSchema, {
      type: Platform_Type.NODE,
      platform,
      arch,
      runtime: version,
      uptime: BigInt(Math.floor(process.uptime())),
      memory: {
        rss: BigInt(memoryUsage.rss),
        heapTotal: BigInt(memoryUsage.heapTotal),
        heapUsed: BigInt(memoryUsage.heapUsed),
        external: BigInt(memoryUsage.external),
        arrayBuffers: BigInt(memoryUsage.arrayBuffers),
      },
    });
  }
};
