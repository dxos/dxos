//
// Copyright 2024 DXOS.org
//

import { trace } from '@dxos/tracing';

import type { Message } from '../signal-methods';

export class SignalClientMonitor {
  private readonly _performance = {
    sentMessages: 0,
    receivedMessages: 0,
    reconnectCounter: 0,
    joinCounter: 0,
    leaveCounter: 0,
  };

  /**
   * Timestamp of when the connection attempt was began.
   */
  private _connectionStarted = new Date();
  /**
   * Timestamp of last state change.
   */
  private _lastStateChange = new Date();

  public getRecordedTimestamps() {
    return {
      connectionStarted: this._connectionStarted,
      lastStateChange: this._lastStateChange,
    };
  }

  public recordStateChangeTime() {
    this._lastStateChange = new Date();
  }

  public recordConnectionStartTime() {
    this._connectionStarted = new Date();
  }

  public recordReconnect() {
    this._performance.reconnectCounter++;
    trace.metrics.increment('mesh.signal.signal-client.reconnect', 1);
  }

  public recordJoin() {
    this._performance.joinCounter++;
  }

  public recordLeave() {
    this._performance.leaveCounter++;
  }

  public recordMessageReceived(message: Message) {
    this._performance.receivedMessages++;
    trace.metrics.increment('mesh.signal.signal-client.received-total', 1, {
      tags: createIdentityTags(message),
    });
    trace.metrics.distribution('mesh.signal.signal-client.bytes-in', getByteCount(message), {
      tags: createIdentityTags(message),
    });
  }

  public async recordMessageSending(message: Message, sendMessage: () => Promise<void>) {
    this._performance.sentMessages++;
    const tags = createIdentityTags(message);
    let success = true;
    try {
      const reqStart = Date.now();
      await sendMessage();
      const reqDuration = Date.now() - reqStart;
      trace.metrics.distribution('mesh.signal.signal-client.send-duration', reqDuration, { tags });
      trace.metrics.distribution('mesh.signal.signal-client.bytes-out', getByteCount(message), { tags });
    } catch (err) {
      success = false;
    }
    trace.metrics.increment('mesh.signal.signal-client.sent-total', 1, {
      tags: { ...tags, success },
    });
  }

  public recordStreamCloseErrors(count: number) {
    trace.metrics.increment('mesh.signal.signal-client.stream-close-errors', count);
  }

  public recordReconciliation(params: { success: boolean }) {
    trace.metrics.increment('mesh.signal.signal-client.reconciliation', 1, {
      tags: {
        success: params.success,
      },
    });
  }
}

const getByteCount = (message: Message): number => {
  return (
    message.author.asUint8Array().length +
    message.recipient.asUint8Array().length +
    message.payload.type_url.length +
    message.payload.value.length
  );
};

const createIdentityTags = (message: Message) => {
  return { peer: message.author.toHex() };
};
