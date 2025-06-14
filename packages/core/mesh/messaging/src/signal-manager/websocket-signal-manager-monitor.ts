//
// Copyright 2024 DXOS.org
//

import { trace } from '@dxos/tracing';

export class WebsocketSignalManagerMonitor {
  public recordRateLimitExceeded(): void {
    trace.metrics.increment('dxos.mesh.signal.signal-manager.rate-limit-hit', 1);
  }

  public recordServerFailure(params: { serverName: string; willRestart: boolean }): void {
    trace.metrics.increment('dxos.mesh.signal.signal-manager.server-failure', 1, {
      tags: {
        server: params.serverName,
        restarted: params.willRestart,
      },
    });
  }
}
