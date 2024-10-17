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

import { type Identity } from '../identity';
import { type DataSpaceManager } from '../spaces';

const AGENT_STATUS_QUERY_RETRY_INTERVAL = 5000;
const AGENT_STATUS_QUERY_RETRY_JITTER = 1000;

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
  public async createAgent() {
    invariant(this.isOpen);
    invariant(this._edgeHttpClient);
    invariant(this._edgeFeatures?.agents);

    const response = await this._edgeHttpClient.createAgent({
      identityKey: this._identity.identityKey.toHex(),
      haloSpaceId: this._identity.haloSpaceId,
      haloSpaceKey: this._identity.haloSpaceKey.toHex(),
    });

    await this._identity.admitDevice({
      deviceKey: PublicKey.fromHex(response.deviceKey),
      controlFeedKey: PublicKey.fromHex(response.feedKey),
      // TODO: agents don't have data feed, should be removed
      dataFeedKey: PublicKey.random(),
    });

    this._updateStatus(EdgeAgentStatus.ACTIVE);
  }

  protected override async _open() {
    if (!this._edgeHttpClient || !this._edgeFeatures?.agents) {
      return;
    }

    this._lastKnownDeviceCount = this._identity.authorizedDeviceKeys.size;
    this._fetchAgentStatusTask = new DeferredTask(this._ctx, async () => {
      await this._fetchAgentStatus();
    });
    this._fetchAgentStatusTask.schedule();

    this._dataSpaceManager.updated.on(this._ctx, () => {
      this._ensureAgentIsInSpaces();
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

  protected override async _close() {
    this._fetchAgentStatusTask = undefined;
    this._lastKnownDeviceCount = 0;
  }

  protected async _fetchAgentStatus() {
    invariant(this._edgeHttpClient);
    try {
      const { agent } = await this._edgeHttpClient.getAgentStatus({ ownerIdentityKey: this._identity.identityKey });
      const wasAgentCreatedDuringQuery = this._agentStatus === EdgeAgentStatus.ACTIVE;
      if (!wasAgentCreatedDuringQuery) {
        this._updateStatus(agent.status);
      }
    } catch (err) {
      if (err instanceof EdgeCallFailedError) {
        if (!err.isRetryable) {
          log.warn('non retryable error on agent status fetch attempt', { err });
          return;
        }
      }
      const retryAfterMs = AGENT_STATUS_QUERY_RETRY_INTERVAL + Math.random() * AGENT_STATUS_QUERY_RETRY_JITTER;
      scheduleTask(this._ctx, () => this._fetchAgentStatusTask?.schedule(), retryAfterMs);
    }
  }

  /**
   * We don't want notarization plugin to always actively poll edge looking for credentials to notarize,
   * because most of the time we'll be getting an empty response.
   * Instead, we stay in active polling mode while there are spaces where we don't see our agent's feed.
   */
  protected _ensureAgentIsInSpaces() {
    const agentDeviceKey = this._agentDeviceKey;
    if (!agentDeviceKey) {
      return;
    }
    for (const space of this._dataSpaceManager.spaces.values()) {
      if ([SpaceState.SPACE_INACTIVE, SpaceState.SPACE_CLOSED].includes(space.state)) {
        continue;
      }
      const agentFeedNeedsNotarization = !space.inner.spaceState.feeds
        .values()
        .some((feed) => feed.assertion.deviceKey.equals(agentDeviceKey));
      space.notarizationPlugin.setActiveEdgePollingEnabled(agentFeedNeedsNotarization);
    }
  }

  private _updateStatus(status: EdgeAgentStatus) {
    this._agentStatus = status;
    if (status !== EdgeAgentStatus.NOT_FOUND) {
      this._ensureAgentIsInSpaces();
    }
    this.agentStatusChanged.emit(status);
  }
}
