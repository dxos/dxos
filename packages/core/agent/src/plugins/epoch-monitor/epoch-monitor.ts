//
// Copyright 2023 DXOS.org
//

import { scheduleTask } from '@dxos/async';
import { type Client, PublicKey } from '@dxos/client';
import { type Space } from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import { checkCredentialType } from '@dxos/credentials';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type EpochMonitorConfig } from '@dxos/protocols/proto/dxos/agent/epoch';
import { ComplexMap } from '@dxos/util';

import { Plugin } from '../plugin';

// TODO(dmaretskyi): Review defaults.
const DEFAULT_OPTIONS: Required<EpochMonitorConfig> & { '@type': string } = {
  '@type': 'dxos.agent.epoch.EpochMonitorConfig',
  minMessagesBetweenEpochs: 10_000,
  minTimeBetweenEpochs: 120_000,
  minInactivityBeforeEpoch: 30_000,
  maxInactivityDelay: 60_000,
};

/**
 * Pipeline monitor:
 * - Triggers new epochs.
 * - Updates address book.
 */
// TODO(burdon): Create test.
export class EpochMonitor extends Plugin {
  public readonly id = 'dxos.org/agent/plugin/epoch-monitor';
  private _ctx?: Context = undefined;
  private _monitors = new ComplexMap<PublicKey, SpaceMonitor>(PublicKey.hash);

  /**
   * Monitor spaces for which the agent is the leader.
   */
  async open() {
    invariant(this._pluginCtx);

    if (!this._config.enabled) {
      log.info('epoch monitor disabled from config');
      return;
    }
    this._ctx = new Context();
    this._config.config = { ...DEFAULT_OPTIONS, ...this._config.config };

    log.info('epoch monitor open', { config: this._config });

    const process = (spaces: Space[]) => {
      spaces.forEach(async (space) => {
        if (!this._monitors.has(space.key)) {
          invariant(this._config.config);
          const monitor = new SpaceMonitor(this._pluginCtx!.client, space, this._config.config);
          this._monitors.set(space.key, monitor);

          log.info('init', { space: space.key, isOpen: space.isOpen });

          if (!this._ctx) {
            return;
          }
          // Process asynchronously.
          scheduleTask(this._ctx, async () => {
            await monitor.open();
          });
        }
      });
    };

    const sub = this._pluginCtx.client.spaces.subscribe(process);
    process(this._pluginCtx.client.spaces.get());
    this._ctx.onDispose(() => sub.unsubscribe());
    this.statusUpdate.emit();
  }

  async close() {
    await this._ctx?.dispose();
    this._ctx = undefined;
    this._monitors.forEach((monitor) => {
      void monitor.close();
    });
    this._monitors.clear();
    this.statusUpdate.emit();
  }
}

class SpaceMonitor {
  private readonly _ctx = new Context();

  private _epochCreationTask?: NodeJS.Timeout = undefined;
  private _maxTimeoutTask?: NodeJS.Timeout = undefined;
  private _creatingEpoch = false;
  private _previousEpochNumber = -1;

  constructor(
    private readonly _client: Client,
    private readonly _space: Space,
    private readonly _options: Required<EpochMonitorConfig>,
  ) {}

  async open() {
    await this._space.waitUntilReady();

    // Monitor spaces owned by this agent.
    if (!this._client!.halo.identity.get()!.identityKey.equals(this._space.internal.data.creator!)) {
      log.info('space is not owned by this agent', {
        key: this._space.key,
        creator: this._space.internal.data.creator,
        identityKey: this._client!.halo.identity.get()!.identityKey,
      });
      return;
    }

    log.info('will create epochs for space', { key: this._space.key, options: this._options });

    const sub = this._space.pipeline.subscribe(async (pipeline) => {
      // Cancel creation if base epoch has changed.
      if (
        this._maxTimeoutTask !== undefined &&
        pipeline.currentEpoch &&
        this._previousEpochNumber !== pipeline.currentEpoch.subject.assertion.number
      ) {
        log.info('epoch changed, cancelling epoch creation', {
          key: this._space.key,
          previousEpochNumber: this._previousEpochNumber,
          currentEpochNumber: pipeline.currentEpoch.subject.assertion.number,
        });
        clearTimeout(this._maxTimeoutTask!);
        this._maxTimeoutTask = undefined;
        clearTimeout(this._epochCreationTask!);
        this._epochCreationTask = undefined;
      }

      if (this._creatingEpoch) {
        return;
      }

      if (!pipeline.currentEpoch || !pipeline.currentDataTimeframe) {
        return;
      }

      // TODO(burdon): Rather than total messages, implement inequality in timeframe?
      invariant(checkCredentialType(pipeline.currentEpoch!, 'dxos.halo.credentials.Epoch'));

      const newMessages = pipeline.currentDataTimeframe!.newMessages(pipeline.currentEpoch.subject.assertion.timeframe);
      const timeSinceLastEpoch = Date.now() - pipeline.currentEpoch.issuanceDate.getTime();

      if (
        newMessages > this._options.minMessagesBetweenEpochs &&
        timeSinceLastEpoch > this._options.minTimeBetweenEpochs
      ) {
        if (!this._maxTimeoutTask) {
          log.info('wanting to create epoch', { key: this._space.key, options: this._options });
          this._previousEpochNumber = pipeline.currentEpoch.subject.assertion.number;
          this._maxTimeoutTask = setTimeout(this._createEpoch.bind(this), this._options.maxInactivityDelay);
        }
        if (this._epochCreationTask) {
          clearTimeout(this._epochCreationTask);
        }
        this._epochCreationTask = setTimeout(this._createEpoch.bind(this), this._options.minInactivityBeforeEpoch);
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
      log.info('epoch created');
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
