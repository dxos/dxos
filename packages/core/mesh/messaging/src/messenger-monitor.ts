//
// Copyright 2024 DXOS.org
//

import { trace } from '@dxos/tracing';

export class MessengerMonitor {
  public recordMessageAckFailed(): void {
    trace.metrics.increment('dxos.mesh.signal.messenger.failed-ack', 1);
  }

  public recordReliableMessage(params: { sendAttempts: number; sent: boolean }): void {
    trace.metrics.increment('dxos.mesh.signal.messenger.reliable-send', 1, {
      tags: {
        success: params.sent,
        attempts: params.sendAttempts,
      },
    });
  }
}
