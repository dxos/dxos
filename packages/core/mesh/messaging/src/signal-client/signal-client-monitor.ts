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

  public getRecordedTimestamps(): { connectionStarted: Date; lastStateChange: Date } {
    return {
      connectionStarted: this._connectionStarted,
      lastStateChange: this._lastStateChange,
    };
  }

  public recordStateChangeTime(): void {
    this._lastStateChange = new Date();
  }

  public recordConnectionStartTime(): void {
    this._connectionStarted = new Date();
  }

  public recordReconnect(params: { success: boolean }): void {
    this._performance.reconnectCounter++;
    trace.metrics.increment('dxos.mesh.signal.signal-client.reconnect', 1, {
      tags: {
        success: params.success,
      },
    });
  }

  public recordJoin(): void {
    this._performance.joinCounter++;
  }

  public recordLeave(): void {
    this._performance.leaveCounter++;
  }

  public recordMessageReceived(message: Message): void {
    this._performance.receivedMessages++;
    trace.metrics.increment('dxos.mesh.signal.signal-client.received-total', 1, {
      tags: createIdentityTags(message),
    });
    trace.metrics.distribution('dxos.mesh.signal.signal-client.bytes-in', getByteCount(message), {
      tags: createIdentityTags(message),
    });
  }

  public async recordMessageSending(message: Message, sendMessage: () => Promise<void>): Promise<void> {
    this._performance.sentMessages++;
    const tags = createIdentityTags(message);
    let success = true;
    try {
      const reqStart = Date.now();
      await sendMessage();
      const reqDuration = Date.now() - reqStart;
      trace.metrics.distribution('dxos.mesh.signal.signal-client.send-duration', reqDuration, { tags });
      trace.metrics.distribution('dxos.mesh.signal.signal-client.bytes-out', getByteCount(message), { tags });
    } catch (err) {
      success = false;
    }
    trace.metrics.increment('dxos.mesh.signal.signal-client.sent-total', 1, {
      tags: { ...tags, success },
    });
  }

  public recordStreamCloseErrors(count: number): void {
    trace.metrics.increment('dxos.mesh.signal.signal-client.stream-close-errors', count);
  }

  public recordReconciliation(params: { success: boolean }): void {
    trace.metrics.increment('dxos.mesh.signal.signal-client.reconciliation', 1, {
      tags: {
        success: params.success,
      },
    });
  }
}

const getByteCount = (message: Message): number =>
  message.author.peerKey.length +
  message.recipient.peerKey.length +
  message.payload.type_url.length +
  message.payload.value.length;

const createIdentityTags = (message: Message) => ({ peer: message.author.peerKey });
