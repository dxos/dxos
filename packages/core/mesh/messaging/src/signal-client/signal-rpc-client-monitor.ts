//
// Copyright 2024 DXOS.org
//

import { type Context } from '@dxos/context';
import { trace } from '@dxos/tracing';

export class SignalRpcClientMonitor {
  public recordClientCloseFailure(ctx: Context, params: { failureReason: string }): void {
    trace.metrics.increment('dxos.mesh.signal.signal-rpc-client.close-failure', 1, {
      tags: {
        reason: params.failureReason,
      },
    });
  }
}
