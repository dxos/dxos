//
// Copyright 2023 DXOS.org
//

import { Client, PublicKey } from '@dxos/client';
import { Space } from '@dxos/client-protocol';
import { checkCredentialType, SpecificCredential } from '@dxos/credentials';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Epoch } from '@dxos/protocols/proto/dxos/halo/credentials';
import { ComplexMap } from '@dxos/util';

import { AbstractPlugin } from '../plugin';
import { Context } from '@dxos/context';
import { scheduleTask } from '@dxos/async';

// TODO(dmaretskyi): Make those more reasonable.
const DEFAULT_OPTIONS: EpochMonitorOptions = {
  minMessageInterval: 1_000,
  minTimeInterval: 20_000,
  inactivity: 5_000,
  maxDelay: 30_000
}

export type EpochMonitorOptions = {
  minMessageInterval: number;
  minTimeInterval: number;
  inactivity: number;
  maxDelay: number;
};

/**
 * Pipeline monitor:
 * - Triggers new epochs.
 * - Updates address book.
 */
// TODO(burdon): Create test.
export class EpochMonitor extends AbstractPlugin {
  private _ctx = new Context()
  private _monitors = new ComplexMap<PublicKey, SpaceMonitor>(PublicKey.hash);

  private readonly _options: EpochMonitorOptions;

  constructor(options: Partial<EpochMonitorOptions> = {}) {
    super();
    this._options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Monitor spaces for which the agent is the leader.
   */
  async open() {
    invariant(this._client);
    const sub = this._client.spaces.subscribe((spaces) => {
      spaces.forEach(async (space) => {
        if (!this._monitors.has(space.key)) {
          const monitor = new SpaceMonitor(this._client!, space, this._options);
          this._monitors.set(space.key, monitor);

          // Process asynchronously.
          if (space.isOpen) {
            scheduleTask(this._ctx, async () => {
              await monitor.open();
            });
          }
        }
      });
    });
    this._ctx.onDispose(() => sub.unsubscribe());
  }

  async close() {
    this._ctx.dispose();
    this._monitors.forEach((monitor) => {
      void monitor.close();
    });
    this._monitors.clear();
  }
}

class SpaceMonitor {
  private readonly _ctx = new Context();

  private _epochCreationTask?: NodeJS.Timeout = undefined;
  private _maxTimeoutTask?: NodeJS.Timeout = undefined;
  private _creatingEpoch = false;

  constructor(
    private readonly _client: Client,
    private readonly _space: Space,
    private readonly _options: EpochMonitorOptions,
  ) { }

  async open() {
    await this._space.waitUntilReady();

    // Monitor spaces owned by this agent.
    if (this._client!.halo.identity.get()!.identityKey.equals(this._space.internal.data.creator!)) {
      return;
    }

    const sub = this._space.pipeline.subscribe(async (pipeline) => {
      if (this._creatingEpoch) {
        return;
      }

      if (!pipeline.currentEpoch || !pipeline.currentDataTimeframe) {
        return;
      }

      // TODO(burdon): Rather than total messages, implement inequality in timeframe?
      invariant(checkCredentialType(pipeline.currentEpoch!, 'dxos.halo.credentials.Epoch'));

      const newMessages = pipeline.currentDataTimeframe!.newMessages(pipeline.currentEpoch.subject.assertion.timeframe)
      const timeSinceLastEpoch = Date.now() - pipeline.currentEpoch.issuanceDate.getTime();

      if (newMessages > this._options.minMessageInterval && timeSinceLastEpoch > this._options.minTimeInterval) {
        if (!this._maxTimeoutTask) {
          log.info('wanting to create epoch', { key: this._space.key, options: this._options });
          this._maxTimeoutTask = setTimeout(this._createEpoch.bind(this), this._options.maxDelay);
        }
        if (this._epochCreationTask) {
          clearTimeout(this._epochCreationTask);
        }
        this._epochCreationTask = setTimeout(this._createEpoch.bind(this), this._options.inactivity);

      }
    });
    this._ctx.onDispose(() => sub.unsubscribe());
  }

  async close() {
    await this._ctx.dispose();
    clearTimeout(this._maxTimeoutTask!);
    this._maxTimeoutTask = undefined;
    clearTimeout(this._epochCreationTask!);
    this._epochCreationTask = undefined;
  }

  private async _createEpoch() {
    if (this._creatingEpoch) {
      return;
    }
    this._creatingEpoch = true;
    try {
      log.info('creating epoch', { key: this._space.key });
      await this._space.internal.createEpoch();
      log.info('epoch created')
    } catch (e) {
      log.catch(e);
    } finally {
      this._creatingEpoch = false;
      clearTimeout(this._maxTimeoutTask!);
      this._maxTimeoutTask = undefined;
      clearTimeout(this._epochCreationTask!);
      this._epochCreationTask = undefined;
    }
  }
}
