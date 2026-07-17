//
// Copyright 2024 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { DeferredTask, Event, scheduleTask, synchronized } from '@dxos/async';
import { Context } from '@dxos/context';
import { Resource } from '@dxos/context';
import { EdgeApiService, type EdgeApiClientService, mapEdgeErrors } from '@dxos/edge-client';
import { EdgeAgentStatus } from '@dxos/edge-protocol';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';

import { type Identity, type IdentityProvider, IdentityProviderService } from '../identity';
import { type DataSpaceManager, DataSpaceManagerService } from '../spaces';
const AGENT_STATUS_QUERY_RETRY_INTERVAL = 5000;
const AGENT_STATUS_QUERY_RETRY_JITTER = 1000;
const AGENT_FEED_ADDED_CHECK_INTERVAL_MS = 3000;

export type EdgeAgentManagerConfig = {};

/**
 * Effect service tag for {@link EdgeAgentManager}.
 */
export class EdgeAgentManagerService extends EffectContext.Tag('@dxos/client-services/EdgeAgentManager')<
  EdgeAgentManagerService,
  EdgeAgentManager
>() {}

export class EdgeAgentManager extends Resource {
  public agentStatusChanged = new Event<EdgeAgentStatus>();

  private _agentDeviceKey: PublicKey | undefined;
  private _agentStatus: EdgeAgentStatus | undefined;

  private _lastKnownDeviceCount = 0;

  private _fetchAgentStatusTask: DeferredTask | undefined;

  constructor(
    private readonly _edgeFeatures: Runtime.Client.EdgeFeatures | undefined,
    private readonly _edgeApiClient: EdgeApiClientService | undefined,
    private readonly _dataSpaceManager: DataSpaceManager,
    private readonly _identityProvider: IdentityProvider,
  ) {
    super();
  }

  private get identity(): Identity {
    return this._identityProvider();
  }

  public get agentStatus(): EdgeAgentStatus | undefined {
    return this._agentStatus;
  }

  public get agentExists() {
    return this._agentStatus && this._agentStatus !== EdgeAgentStatus.NOT_FOUND;
  }

  @synchronized
  public async createAgent(_ctx: Context): Promise<void> {
    invariant(this.isOpen);
    invariant(this._edgeApiClient);
    invariant(this._edgeFeatures?.agents);

    const { data: response } = await Effect.runPromise(
      mapEdgeErrors(
        this._edgeApiClient.client.agents.createAgent({
          payload: {
            identityDid: this.identity.did,
            haloSpaceId: this.identity.haloSpaceId,
            haloSpaceKey: this.identity.haloSpaceKey.toHex(),
          },
        }),
      ),
    );

    const deviceKey = PublicKey.fromHex(response.deviceKey);

    if (await this.identity.authorizedDeviceKeys.has(deviceKey)) {
      log.info('agent was already added to HALO, ignoring response', { response });
      this._updateStatus(EdgeAgentStatus.ACTIVE, deviceKey);
      return;
    }

    await this.identity.admitDevice({
      deviceKey,
      controlFeedKey: PublicKey.fromHex(response.feedKey),
      // TODO: agents don't have data feed, should be removed
      dataFeedKey: PublicKey.random(),
    });

    log('agent created', response);

    this._updateStatus(EdgeAgentStatus.ACTIVE, deviceKey);
  }

  protected override async _open(): Promise<void> {
    const isEnabled = this._edgeApiClient && this._edgeFeatures?.agents;

    log('edge agent manager open', { isEnabled });

    if (!isEnabled) {
      return;
    }

    this._lastKnownDeviceCount = this.identity.authorizedDeviceKeys.size;
    this._fetchAgentStatusTask = new DeferredTask(this._ctx, async () => {
      await this._fetchAgentStatus();
    });
    this._fetchAgentStatusTask.schedule();

    this._dataSpaceManager.updated.on(this._ctx, () => {
      if (this._agentDeviceKey) {
        this._ensureAgentIsInSpaces(this._agentDeviceKey);
      }
    });

    this.identity.stateUpdate.on(this._ctx, () => {
      const maybeAgentWasCreated = this.identity.authorizedDeviceKeys.size > this._lastKnownDeviceCount;
      if (this.agentExists || !maybeAgentWasCreated) {
        return;
      }
      this._lastKnownDeviceCount = this.identity.authorizedDeviceKeys.size;
      this._fetchAgentStatusTask?.schedule();
    });
  }

  protected override async _close(): Promise<void> {
    this._fetchAgentStatusTask = undefined;
    this._lastKnownDeviceCount = 0;
  }

  protected async _fetchAgentStatus(): Promise<void> {
    invariant(this._edgeApiClient);
    log('fetching agent status');

    // `EdgeRequestError`/`EdgeAuthChallengeError` are handled inside the effect via `catchTag` and
    // reduced to an outcome, so this never rejects for an edge failure. A non-retryable request
    // failure gives up quietly (agent status simply unavailable); everything else reschedules.
    const outcome = await Effect.runPromise(
      mapEdgeErrors(this._edgeApiClient.client.agents.agentStatus({ path: { identity: this.identity.did } })).pipe(
        Effect.map(({ data }) => ({ tag: 'ok' as const, agent: data.agent })),
        Effect.catchTag('EdgeRequestError', (error) =>
          Effect.succeed(error.isRetryable ? { tag: 'retry' as const, error } : { tag: 'giveup' as const, error }),
        ),
        Effect.catchTag('EdgeAuthChallengeError', (error) => Effect.succeed({ tag: 'retry' as const, error })),
      ),
    );

    if (outcome.tag === 'giveup') {
      log.warn('non retryable error on agent status fetch attempt', { err: outcome.error });
      return;
    }
    if (outcome.tag === 'retry') {
      const retryAfterMs = AGENT_STATUS_QUERY_RETRY_INTERVAL + Math.random() * AGENT_STATUS_QUERY_RETRY_JITTER;
      log.info('agent status fetching failed', { err: outcome.error, retryAfterMs });
      scheduleTask(this._ctx, () => this._fetchAgentStatusTask?.schedule(), retryAfterMs);
      return;
    }

    const { agent } = outcome;
    const wasAgentCreatedDuringQuery = this._agentStatus === EdgeAgentStatus.ACTIVE;
    if (!wasAgentCreatedDuringQuery) {
      const deviceKey = agent.deviceKey ? PublicKey.fromHex(agent.deviceKey) : undefined;
      this._updateStatus(agent.status, deviceKey);
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

      log.verbose('set active edge polling', { enabled: agentFeedNeedsNotarization, spaceId: space.id });
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
    log.verbose('agent status update', { status });
  }
}

export type EdgeAgentManagerLayerOptions = {
  edgeFeatures?: Runtime.Client.EdgeFeatures;
};

/**
 * Effect Layer constructing a dormant {@link EdgeAgentManager}.
 */
export const EdgeAgentManagerLayer = (
  options: EdgeAgentManagerLayerOptions = {},
): Layer.Layer<EdgeAgentManagerService, never, DataSpaceManagerService | IdentityProviderService> =>
  Layer.effect(
    EdgeAgentManagerService,
    Effect.gen(function* () {
      const dataSpaceManager = yield* DataSpaceManagerService;
      const identityProvider = yield* IdentityProviderService;
      const edgeApiClient = yield* Effect.serviceOption(EdgeApiService);
      return new EdgeAgentManager(
        options.edgeFeatures,
        Option.getOrUndefined(edgeApiClient),
        dataSpaceManager,
        identityProvider,
      );
    }),
  );
