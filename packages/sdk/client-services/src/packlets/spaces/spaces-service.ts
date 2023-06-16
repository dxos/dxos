//
// Copyright 2022 DXOS.org
//

import { EventSubscriptions, scheduleTask } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { raise, todo } from '@dxos/debug';
import { DataServiceSubscriptions, SpaceManager, SpaceNotFoundError } from '@dxos/echo-pipeline';
import { log } from '@dxos/log';
import { encodeError } from '@dxos/protocols';
import {
  CreateEpochRequest,
  PostMessageRequest,
  QueryCredentialsRequest,
  QuerySpacesResponse,
  Space,
  SpaceMember,
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

const TIMEFRAME_UPDATE_DEBOUNCE_TIME = 500;

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
    return this._transformSpace(space);
  }

  async updateSpace(request: UpdateSpaceRequest) {
    todo();
  }

  querySpaces(): Stream<QuerySpacesResponse> {
    return new Stream<QuerySpacesResponse>(({ next, ctx }) => {
      const onUpdate = async () => {
        const dataSpaceManager = await this._getDataSpaceManager();
        const spaces = Array.from(dataSpaceManager.spaces.values()).map((space) => this._transformSpace(space));
        log('update', { spaces });
        next({ spaces });
      };

      scheduleTask(ctx, async () => {
        const dataSpaceManager = await this._getDataSpaceManager();

        const subscriptions = new EventSubscriptions();
        ctx.onDispose(() => subscriptions.clear());

        // TODO(dmaretskyi): Create a pattern for subscribing to a set of objects.
        const subscribeSpaces = () => {
          subscriptions.clear();

          for (const space of dataSpaceManager.spaces.values()) {
            subscriptions.add(space.stateUpdate.on(ctx, onUpdate));
            subscriptions.add(space.presence.updated.on(ctx, onUpdate));

            // Pipeline progress.
            space.inner.controlPipeline.state.timeframeUpdate
              .debounce(TIMEFRAME_UPDATE_DEBOUNCE_TIME)
              .on(ctx, onUpdate);
            if (space.dataPipeline.pipelineState) {
              subscriptions.add(
                space.dataPipeline.pipelineState.timeframeUpdate
                  .debounce(TIMEFRAME_UPDATE_DEBOUNCE_TIME)
                  .on(ctx, onUpdate),
              );
            }
          }
        };

        dataSpaceManager.updated.on(ctx, () => {
          subscribeSpaces();
          void onUpdate();
        });
        subscribeSpaces();

        void onUpdate();
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

      const processor = space.spaceState.registerProcessor({
        process: async (credential) => {
          next(credential);
        },
      });
      ctx.onDispose(() => processor.close());
      scheduleTask(ctx, () => processor.open());
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

  private _transformSpace(space: DataSpace): Space {
    return {
      spaceKey: space.key,
      state: space.state,
      error: space.error ? encodeError(space.error) : undefined,
      pipeline: {
        controlFeeds: space.inner.controlPipeline.state.feeds.map((feed) => feed.key),
        currentControlTimeframe: space.inner.controlPipeline.state.timeframe,
        targetControlTimeframe: space.inner.controlPipeline.state.targetTimeframe,
        totalControlTimeframe: space.inner.controlPipeline.state.endTimeframe,

        dataFeeds: space.dataPipeline.pipelineState?.feeds.map((feed) => feed.key) ?? [],
        currentDataTimeframe: space.dataPipeline.pipelineState?.timeframe,
        targetDataTimeframe: space.dataPipeline.pipelineState?.targetTimeframe,
        totalDataTimeframe: space.dataPipeline.pipelineState?.endTimeframe,
      },
      members: Array.from(space.inner.spaceState.members.values()).map((member) => ({
        identity: {
          identityKey: member.key,
          profile: {
            displayName: member.assertion.profile?.displayName ?? humanize(member.key),
          },
        },
        presence:
          this._identityManager.identity?.identityKey.equals(member.key) ||
          space.presence.getPeersOnline().filter(({ identityKey }) => identityKey.equals(member.key)).length > 0
            ? SpaceMember.PresenceState.ONLINE
            : SpaceMember.PresenceState.OFFLINE,
      })),
      cache: space.cache,
      metrics: space.metrics,
    };
  }
}

// Add `user-channel` prefix to the channel name, so that it doesn't collide with the internal channels.
const getChannelId = (channel: string): string => `user-channel/${channel}`;
