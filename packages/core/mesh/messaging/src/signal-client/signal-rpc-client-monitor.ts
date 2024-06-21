//
// Copyright 2024 DXOS.org
//

import { trace } from '@dxos/tracing';

export class SignalRpcClientMonitor {
  public recordClientCloseFailure(params: { failureReason: string }) {
    trace.metrics.increment('mesh.signal.signal-rpc-client.close-failure', 1, {
      tags: {
        reason: params.failureReason,
      },
    });
  }
}
