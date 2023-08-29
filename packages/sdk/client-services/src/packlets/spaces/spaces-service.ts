//
// Copyright 2022 DXOS.org
//

import { EventSubscriptions, UpdateScheduler, scheduleTask } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { CredentialProcessor } from '@dxos/credentials';
import { raise } from '@dxos/debug';
import { DataServiceSubscriptions, SpaceManager, SpaceNotFoundError } from '@dxos/echo-pipeline';
import { ApiError } from '@dxos/errors';
import { log } from '@dxos/log';
import { encodeError } from '@dxos/protocols';
import {
  CreateEpochRequest,
  PostMessageRequest,
  QueryCredentialsRequest,
  QuerySpacesResponse,
  Space,
  SpaceMember,
  SpaceState,
  SpacesService,
  SubscribeMessagesRequest,
  UpdateSpaceRequest,
  WriteCredentialsRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import { Provider, humanize } from '@dxos/util';

import { IdentityManager } from '../identity';
import { DataSpace } from './data-space';
import { DataSpaceManager } from './data-space-manager';

export class SpacesServiceImpl implements SpacesService {
  constructor(
    private readonly _identityManager: IdentityManager,
    private readonly _spaceManager: SpaceManager,
    private readonly _dataServiceSubscriptions: DataServiceSubscriptions,
    private readonly _getDataSpaceManager: Provider<Promise<DataSpaceManager>>,
  ) {}

  async createSpace(): Promise<Space> {
    if (!this._identityManager.identity) {
      throw new Error('This device has no HALO identity available. See https://docs.dxos.org/guide/halo');
    }

    const dataSpaceManager = await this._getDataSpaceManager();
    const space = await dataSpaceManager.createSpace();
    return this._serializeSpace(space);
  }

  async updateSpace({ spaceKey, state }: UpdateSpaceRequest) {
    const dataSpaceManager = await this._getDataSpaceManager();
    const space = dataSpaceManager.spaces.get(spaceKey) ?? raise(new SpaceNotFoundError(spaceKey));

    if (state) {
      switch (state) {
        case SpaceState.ACTIVE:
          await space.activate();
          break;

        case SpaceState.INACTIVE:
          await space.deactivate();
          break;
        default:
          throw new ApiError('Invalid space state');
      }
    }
  }

  querySpaces(): Stream<QuerySpacesResponse> {
    return new Stream<QuerySpacesResponse>(({ next, ctx }) => {
      const scheduler = new UpdateScheduler(
        ctx,
        async () => {
          const dataSpaceManager = await this._getDataSpaceManager();
          const spaces = Array.from(dataSpaceManager.spaces.values()).map((space) => this._serializeSpace(space));
          log('update', { spaces });
          next({ spaces });
        },
        { maxFrequency: process.env.NODE_ENV === 'test' ? undefined : 2 },
      );

      scheduleTask(ctx, async () => {
        const dataSpaceManager = await this._getDataSpaceManager();

        const subscriptions = new EventSubscriptions();
        ctx.onDispose(() => subscriptions.clear());

        // TODO(dmaretskyi): Create a pattern for subscribing to a set of objects.
        const subscribeSpaces = () => {
          subscriptions.clear();

          for (const space of dataSpaceManager.spaces.values()) {
            subscriptions.add(space.stateUpdate.on(ctx, () => scheduler.trigger()));
            subscriptions.add(space.presence.updated.on(ctx, () => scheduler.trigger()));
            subscriptions.add(space.dataPipeline.onNewEpoch.on(ctx, () => scheduler.trigger()));

            // Pipeline progress.
            space.inner.controlPipeline.state.timeframeUpdate.on(ctx, () => scheduler.trigger());
            if (space.dataPipeline.pipelineState) {
              subscriptions.add(space.dataPipeline.pipelineState.timeframeUpdate.on(ctx, () => scheduler.trigger()));
            }
          }
        };

        dataSpaceManager.updated.on(ctx, () => {
          subscribeSpaces();
          scheduler.trigger();
        });
        subscribeSpaces();

        scheduler.trigger();
      });

      if (!this._identityManager.identity) {
        next({ spaces: [] });
      }
    });
  }

  async postMessage({ spaceKey, channel, message }: PostMessageRequest) {
    const dataSpaceManager = await this._getDataSpaceManager();
    const space = dataSpaceManager.spaces.get(spaceKey) ?? raise(new SpaceNotFoundError(spaceKey));
    await space.postMessage(getChannelId(channel), message);
  }

  subscribeMessages({ spaceKey, channel }: SubscribeMessagesRequest) {
    return new Stream<GossipMessage>(({ ctx, next }) => {
      scheduleTask(ctx, async () => {
        const dataSpaceManager = await this._getDataSpaceManager();
        const space = dataSpaceManager.spaces.get(spaceKey) ?? raise(new SpaceNotFoundError(spaceKey));
        const handle = space.listen(getChannelId(channel), (message) => {
          next(message);
        });
        ctx.onDispose(() => handle.unsubscribe());
      });
    });
  }

  queryCredentials({ spaceKey }: QueryCredentialsRequest): Stream<Credential> {
    return new Stream(({ ctx, next }) => {
      const space = this._spaceManager.spaces.get(spaceKey) ?? raise(new SpaceNotFoundError(spaceKey));

      const processor: CredentialProcessor = {
        processCredential: async (credential) => {
          next(credential);
        },
      };
      ctx.onDispose(() => space.spaceState.removeCredentialProcessor(processor));
      scheduleTask(ctx, () => space.spaceState.addCredentialProcessor(processor));
    });
  }

  async writeCredentials({ spaceKey, credentials }: WriteCredentialsRequest) {
    const space = this._spaceManager.spaces.get(spaceKey) ?? raise(new SpaceNotFoundError(spaceKey));
    for (const credential of credentials ?? []) {
      await space.controlPipeline.writer.write({ credential: { credential } });
    }
  }

  async createEpoch({ spaceKey }: CreateEpochRequest) {
    const dataSpaceManager = await this._getDataSpaceManager();
    const space = dataSpaceManager.spaces.get(spaceKey) ?? raise(new SpaceNotFoundError(spaceKey));
    await space.createEpoch();
  }

  private _serializeSpace(space: DataSpace): Space {
    return {
      spaceKey: space.key,
      state: space.state,
      error: space.error ? encodeError(space.error) : undefined,
      pipeline: {
        currentEpoch: space.dataPipeline.currentEpoch,
        appliedEpoch: space.dataPipeline.appliedEpoch,

        controlFeeds: space.inner.controlPipeline.state.feeds.map((feed) => feed.key),
        currentControlTimeframe: space.inner.controlPipeline.state.timeframe,
        targetControlTimeframe: space.inner.controlPipeline.state.targetTimeframe,
        totalControlTimeframe: space.inner.controlPipeline.state.endTimeframe,

        dataFeeds: space.dataPipeline.pipelineState?.feeds.map((feed) => feed.key) ?? [],
        startDataTimeframe: space.dataPipeline.pipelineState?.startTimeframe,
        currentDataTimeframe: space.dataPipeline.pipelineState?.timeframe,
        targetDataTimeframe: space.dataPipeline.pipelineState?.targetTimeframe,
        totalDataTimeframe: space.dataPipeline.pipelineState?.endTimeframe,
      },
      members: Array.from(space.inner.spaceState.members.values()).map((member) => {
        const peers = space.presence.getPeersOnline().filter(({ identityKey }) => identityKey.equals(member.key));
        const isMe = this._identityManager.identity?.identityKey.equals(member.key);

        if (isMe) {
          peers.push(space.presence.getLocalState());
        }

        return {
          identity: {
            identityKey: member.key,
            profile: {
              displayName: member.assertion.profile?.displayName ?? humanize(member.key),
            },
          },
          presence: isMe || peers.length > 0 ? SpaceMember.PresenceState.ONLINE : SpaceMember.PresenceState.OFFLINE,
          peerStates: peers,
        };
      }),
      creator: space.inner.spaceState.creator?.key,
      cache: space.cache,
      metrics: space.metrics,
    };
  }
}

// Add `user-channel` prefix to the channel name, so that it doesn't collide with the internal channels.
const getChannelId = (channel: string): string => `user-channel/${channel}`;
