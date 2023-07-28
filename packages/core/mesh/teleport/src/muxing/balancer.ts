//
// Copyright 2023 DXOS.org
//

import { Trigger } from '@dxos/async';

// TODO(egorgripasov): Is BinaryPort a better name?
import { RpcPort } from './rpc-port';

type RpcCall = {
  msg: Uint8Array;
  trigger: Trigger;
};

export class Balancer {
  private _lastCallerIndex = 0;
  private _channels: number[] = [];

  // TODO(egorgripasov): Will cause a memory leak if channels do not appreciate the backpressure.
  private _calls: Map<number, RpcCall[]> = new Map();

  constructor(private readonly _port: RpcPort, private readonly _sysChannelId: number) {
    this._channels.push(_sysChannelId);
  }

  addChannel(channel: number) {
    this._channels.push(channel);
  }

  pushChunk(msg: Uint8Array, trigger: Trigger, channelId: number) {
    const noCalls = this._calls.size === 0

    if (!this._channels.includes(channelId)) {
      throw new Error(`Unknown channel ${channelId}`);
    }

    if (!this._calls.has(channelId)) {
      this._calls.set(channelId, []);
    }

    const channelCalls = this._calls.get(channelId)!;
    channelCalls.push({ msg, trigger });

    // Start processing calls if this is the first call.
    if (noCalls) {
      process.nextTick(async () => {
        await this._processCalls();
      });
    }
  }

  destroy() {
    this._calls.clear();
  }

  private _getNextCallerId() {
    // if there is a system call, return it
    if (this._calls.has(this._sysChannelId)) {
      return this._sysChannelId;
    }

    const index = this._lastCallerIndex;
    this._lastCallerIndex = (this._lastCallerIndex + 1) % this._channels.length;

    return this._channels[index];
  }

  private _getNextCall(): RpcCall {
    let call;
    while (!call) {
      const channelId = this._getNextCallerId();
      const channelCalls = this._calls.get(channelId);
      if (!channelCalls) {
        continue;
      }

      call = channelCalls.shift();
      if (channelCalls.length === 0) {
        this._calls.delete(channelId);
      }
    }
    return call;
  }

  private async _processCalls() {
    if (this._calls.size === 0) {
      return;
    }

    const call = this._getNextCall();

    try {
      await this._port.send(call.msg);
      call.trigger.wake();
    } catch (err: any) {
      call.trigger.throw(err);
    }

    await this._processCalls();
  }
}
