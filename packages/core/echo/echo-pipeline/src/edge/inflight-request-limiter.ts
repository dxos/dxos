//
// Copyright 2025 DXOS.org
//

import { Trigger } from '@dxos/async';
import { Resource } from '@dxos/context';
import { log } from '@dxos/log';
import { type AutomergeProtocolMessage } from '@dxos/protocols';

type InflightRequestLimiterConfig = {
  maxInflightRequests: number;
  resetBalanceTimeoutMs: number;
};

export class InflightRequestLimiter extends Resource {
  /**
   * Decrement when we receive a sync message, increment when we send one.
   * Can't exceed _config.maxInflightRequests.
   * Resets after timeout to avoid replicator being stuck.
   */
  private _inflightRequestBalance = 0;
  private _requestBarrier = new Trigger();
  private _resetBalanceTimeout: NodeJS.Timeout | undefined;

  constructor(private readonly _config: InflightRequestLimiterConfig) {
    super();
  }

  protected override async _open(): Promise<void> {
    this._inflightRequestBalance = 0;
    this._requestBarrier.reset();
    this._requestBarrier.wake();
  }

  protected override async _close(): Promise<void> {
    this._inflightRequestBalance = 0;
    this._requestBarrier.throw(new Error('Rate limiter closed.'));
    clearTimeout(this._resetBalanceTimeout);
  }

  public async rateLimit(message: AutomergeProtocolMessage): Promise<void> {
    if (message.type !== 'sync') {
      return;
    }
    while (this._inflightRequestBalance >= this._config.maxInflightRequests) {
      await this._requestBarrier.wait();
    }
    this._inflightRequestBalance++;
    if (this._inflightRequestBalance === this._config.maxInflightRequests) {
      this._requestBarrier.reset();
      this._resetBalanceTimeout = setTimeout(() => {
        log.warn('Request balance has not changed during specified timeout, resetting request limiter.');
        this._inflightRequestBalance = 0;
        this._requestBarrier.wake();
      }, this._config.resetBalanceTimeoutMs);
    }
  }

  public handleResponse(message: AutomergeProtocolMessage): void {
    if (message.type !== 'sync') {
      return;
    }
    this._inflightRequestBalance--;
    if (this._inflightRequestBalance + 1 === this._config.maxInflightRequests) {
      this._requestBarrier.wake();
      clearInterval(this._resetBalanceTimeout);
    }
  }
}
