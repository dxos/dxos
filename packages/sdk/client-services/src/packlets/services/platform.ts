//
// Copyright 2022 DXOS.org
//

import { buf } from '@dxos/protocols/buf';
import { type Platform, Platform_PLATFORM_TYPE, PlatformSchema } from '@dxos/protocols/buf/dxos/client/services_pb';

export const getPlatform = (): Platform => {
  if ((process as any).browser) {
    if (typeof window !== 'undefined') {
      // Browser.
      const { userAgent } = window.navigator;
      return buf.create(PlatformSchema, {
        type: Platform_PLATFORM_TYPE.BROWSER,
        userAgent,
        uptime: Math.floor((Date.now() - window.performance.timeOrigin) / 1_000),
      });
    } else {
      // Dedicated worker.
      return buf.create(PlatformSchema, {
        type: Platform_PLATFORM_TYPE.DEDICATED_WORKER,
        uptime: Math.floor((Date.now() - performance.timeOrigin) / 1_000),
      });
    }
  } else {
    // Node.
    const { platform, version, arch } = process;
    // `MemoryUsage` is an interface without an index signature, so the Struct field takes the
    // fields explicitly rather than the object itself.
    const { rss, heapTotal, heapUsed, external, arrayBuffers } = process.memoryUsage();
    return buf.create(PlatformSchema, {
      type: Platform_PLATFORM_TYPE.NODE,
      platform,
      arch,
      runtime: version,
      uptime: Math.floor(process.uptime()),
      memory: { rss, heapTotal, heapUsed, external, arrayBuffers },
    });
  }
};
