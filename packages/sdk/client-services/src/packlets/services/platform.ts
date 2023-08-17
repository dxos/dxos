//
// Copyright 2022 DXOS.org
//

import type = Mocha.utils.type;

export type Platform = {
  type: 'browser' | 'shared-worker' | 'node';
  userAgent?: string;
  platform?: string;
  runtime?: string;
  uptime?: number;
  memory?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
};

export const getPlatform = (): Platform => {
  if ((process as any).browser) {
    if (typeof window !== 'undefined') {
      // Browser.
      const { userAgent } = window.navigator;
      return {
        type: 'browser',
        userAgent,
      };
    } else {
      // Shared worker.
      // TODO(burdon): Uptime.
      return {
        type: 'shared-worker',
      };
    }
  } else {
    // Node.
    const { platform, version, arch } = process;
    return {
      type: 'node',
      platform: `${platform} ${version} ${arch}`,
      runtime: process.version,
      uptime: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
    };
  }
};
