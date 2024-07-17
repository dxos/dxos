//
// Copyright 2024 DXOS.org
//

import { trace } from '@dxos/tracing';

export class MessengerMonitor {
  public recordMessageAckFailed() {
    trace.metrics.increment('dxos.mesh.signal.messenger.failed-ack', 1);
  }

  public recordReliableMessage(params: { sendAttempts: number; sent: boolean }) {
    trace.metrics.increment('dxos.mesh.signal.messenger.reliable-send', 1, {
      tags: {
        success: params.sent,
        attempts: params.sendAttempts,
      },
    });
  }
}
