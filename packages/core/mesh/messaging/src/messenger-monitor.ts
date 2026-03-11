//
// Copyright 2024 DXOS.org
//

import { type Context } from '@dxos/context';
import { trace } from '@dxos/tracing';

export class MessengerMonitor {
  public recordMessageAckFailed(_ctx: Context): void {
    trace.metrics.increment('dxos.mesh.signal.messenger.failed-ack', 1);
  }

  public recordReliableMessage(ctx: Context, params: { sendAttempts: number; sent: boolean }): void {
    trace.metrics.increment('dxos.mesh.signal.messenger.reliable-send', 1, {
      tags: {
        success: params.sent,
        attempts: params.sendAttempts,
      },
    });
  }
}
