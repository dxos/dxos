//
// Copyright 2024 DXOS.org
//

import { DeferredTask, Event, scheduleTask, synchronized } from '@dxos/async';
import { Resource } from '@dxos/context';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { EdgeAgentStatus, EdgeCallFailedError } from '@dxos/protocols';
import { SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';

import { type Identity } from '../identity';
import { type DataSpaceManager } from '../spaces';

const AGENT_STATUS_QUERY_RETRY_INTERVAL = 5000;
const AGENT_STATUS_QUERY_RETRY_JITTER = 1000;
const AGENT_FEED_ADDED_CHECK_INTERVAL_MS = 3000;

export type EdgeAgentManagerConfig = {};

export class EdgeAgentManager extends Resource {
  public agentStatusChanged = new Event<EdgeAgentStatus>();

  private _agentDeviceKey: PublicKey | undefined;
  private _agentStatus: EdgeAgentStatus | undefined;

  private _lastKnownDeviceCount = 0;

  private _fetchAgentStatusTask: DeferredTask | undefined;

  constructor(
    private readonly _edgeFeatures: Runtime.Client.EdgeFeatures | undefined,
    private readonly _edgeHttpClient: EdgeHttpClient | undefined,
    private readonly _dataSpaceManager: DataSpaceManager,
    private readonly _identity: Identity,
  ) {
    super();
  }

  public get agentStatus(): EdgeAgentStatus | undefined {
    return this._agentStatus;
  }

  public get agentExists() {
    return this._agentStatus && this._agentStatus !== EdgeAgentStatus.NOT_FOUND;
  }

  @synchronized
  public async createAgent(): Promise<void> {
    invariant(this.isOpen);
    invariant(this._edgeHttpClient);
    invariant(this._edgeFeatures?.agents);

    const response = await this._edgeHttpClient.createAgent({
      identityKey: this._identity.identityKey.toHex(),
      haloSpaceId: this._identity.haloSpaceId,
      haloSpaceKey: this._identity.haloSpaceKey.toHex(),
    });

    const deviceKey = PublicKey.fromHex(response.deviceKey);

    if (await this._identity.authorizedDeviceKeys.has(deviceKey)) {
      log.info('agent was already added to HALO, ignoring response', { response });
      this._updateStatus(EdgeAgentStatus.ACTIVE, deviceKey);
      return;
    }

    await this._identity.admitDevice({
      deviceKey,
      controlFeedKey: PublicKey.fromHex(response.feedKey),
      // TODO: agents don't have data feed, should be removed
      dataFeedKey: PublicKey.random(),
    });

    log('agent created', response);

    this._updateStatus(EdgeAgentStatus.ACTIVE, deviceKey);
  }

  protected override async _open(): Promise<void> {
    const isEnabled = this._edgeHttpClient && this._edgeFeatures?.agents;

    log('edge agent manager open', { isEnabled });

    if (!isEnabled) {
      return;
    }

    this._lastKnownDeviceCount = this._identity.authorizedDeviceKeys.size;
    this._fetchAgentStatusTask = new DeferredTask(this._ctx, async () => {
      await this._fetchAgentStatus();
    });
    this._fetchAgentStatusTask.schedule();

    this._dataSpaceManager.updated.on(this._ctx, () => {
      if (this._agentDeviceKey) {
        this._ensureAgentIsInSpaces(this._agentDeviceKey);
      }
    });

    this._identity.stateUpdate.on(this._ctx, () => {
      const maybeAgentWasCreated = this._identity.authorizedDeviceKeys.size > this._lastKnownDeviceCount;
      if (this.agentExists || !maybeAgentWasCreated) {
        return;
      }
      this._lastKnownDeviceCount = this._identity.authorizedDeviceKeys.size;
      this._fetchAgentStatusTask?.schedule();
    });
  }

  protected override async _close(): Promise<void> {
    this._fetchAgentStatusTask = undefined;
    this._lastKnownDeviceCount = 0;
  }

  protected async _fetchAgentStatus(): Promise<void> {
    invariant(this._edgeHttpClient);
    try {
      log('fetching agent status');
      const { agent } = await this._edgeHttpClient.getAgentStatus({ ownerIdentityKey: this._identity.identityKey });
      const wasAgentCreatedDuringQuery = this._agentStatus === EdgeAgentStatus.ACTIVE;
      if (!wasAgentCreatedDuringQuery) {
        const deviceKey = agent.deviceKey ? PublicKey.fromHex(agent.deviceKey) : undefined;
        this._updateStatus(agent.status, deviceKey);
      }
    } catch (err) {
      if (err instanceof EdgeCallFailedError) {
        if (!err.isRetryable) {
          log.warn('non retryable error on agent status fetch attempt', { err });
          return;
        }
      }
      const retryAfterMs = AGENT_STATUS_QUERY_RETRY_INTERVAL + Math.random() * AGENT_STATUS_QUERY_RETRY_JITTER;
      log.info('agent status fetching failed', { err, retryAfterMs });
      scheduleTask(this._ctx, () => this._fetchAgentStatusTask?.schedule(), retryAfterMs);
    }
  }

  /**
   * We don't want notarization plugin to always actively poll edge looking for credentials to notarize,
   * because most of the time we'll be getting an empty response.
   * Instead, we stay in active polling mode while there are spaces where we don't see our agent's feed.
   */
  protected _ensureAgentIsInSpaces(agentDeviceKey: PublicKey): void {
    let activePollingEnabled = false;
    for (const space of this._dataSpaceManager.spaces.values()) {
      if (space.getEdgeReplicationSetting() === EdgeReplicationSetting.DISABLED) {
        space.notarizationPlugin.setActiveEdgePollingEnabled(false);
        continue;
      }
      if ([SpaceState.SPACE_INACTIVE, SpaceState.SPACE_CLOSED].includes(space.state)) {
        space.notarizationPlugin.setActiveEdgePollingEnabled(false);
        continue;
      }
      const agentFeedNeedsNotarization = ![...space.inner.spaceState.feeds.values()].some((feed) =>
        feed.assertion.deviceKey.equals(agentDeviceKey),
      );
      space.notarizationPlugin.setActiveEdgePollingEnabled(agentFeedNeedsNotarization);
      activePollingEnabled = activePollingEnabled || agentFeedNeedsNotarization;

      log.info('set active edge polling', { enabled: agentFeedNeedsNotarization, spaceId: space.id });
    }

    if (activePollingEnabled) {
      // Check again to see if active edge polling can be disabled (agent feed is notarized in all the spaces)
      scheduleTask(this._ctx, () => this._ensureAgentIsInSpaces(agentDeviceKey), AGENT_FEED_ADDED_CHECK_INTERVAL_MS);
    }
  }

  private _updateStatus(status: EdgeAgentStatus, deviceKey: PublicKey | undefined): void {
    this._agentStatus = status;
    this._agentDeviceKey = deviceKey;
    this.agentStatusChanged.emit(status);
    if (deviceKey) {
      this._ensureAgentIsInSpaces(deviceKey);
    }
    log.info('agent status update', { status });
  }
}
