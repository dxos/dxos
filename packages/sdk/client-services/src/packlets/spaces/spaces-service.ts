//
// Copyright 2022 DXOS.org
//

import { EventSubscriptions, UpdateScheduler, scheduleTask } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { type CredentialProcessor } from '@dxos/credentials';
import { raise } from '@dxos/debug';
import { type SpaceManager } from '@dxos/echo-pipeline';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ApiError, SpaceNotFoundError, encodeError } from '@dxos/protocols';
import {
  SpaceMember,
  SpaceState,
  type CreateEpochRequest,
  type PostMessageRequest,
  type QueryCredentialsRequest,
  type QuerySpacesResponse,
  type Space,
  type SpacesService,
  type SubscribeMessagesRequest,
  type UpdateSpaceRequest,
  type WriteCredentialsRequest,
  type UpdateMemberRoleRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import { type Credential, SpaceMember as HaloSpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import { type Provider } from '@dxos/util';

import { type DataSpace } from './data-space';
import { type DataSpaceManager } from './data-space-manager';
import { type IdentityManager } from '../identity';

export class SpacesServiceImpl implements SpacesService {
  constructor(
    private readonly _identityManager: IdentityManager,
    private readonly _spaceManager: SpaceManager,
    private readonly _getDataSpaceManager: Provider<Promise<DataSpaceManager>>,
  ) {}

  async createSpace(): Promise<Space> {
    if (!this._identityManager.identity) {
      throw new Error('This device has no HALO identity available. See https://docs.dxos.org/guide/platform/halo');
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

  async updateMemberRole(_: UpdateMemberRoleRequest): Promise<void> {
    throw new Error('not implemented');
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
            // TODO(dmaretskyi): This can skip updates and not report intermediate states. Potential race condition here.
            subscriptions.add(space.stateUpdate.on(ctx, () => scheduler.forceTrigger()));

            subscriptions.add(space.presence.updated.on(ctx, () => scheduler.trigger()));
            subscriptions.add(space.automergeSpaceState.onNewEpoch.on(ctx, () => scheduler.trigger()));

            // Pipeline progress.
            subscriptions.add(space.inner.controlPipeline.state.timeframeUpdate.on(ctx, () => scheduler.trigger()));
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

  queryCredentials({ spaceKey, noTail }: QueryCredentialsRequest): Stream<Credential> {
    return new Stream(({ ctx, next, close }) => {
      const space = this._spaceManager.spaces.get(spaceKey) ?? raise(new SpaceNotFoundError(spaceKey));

      const processor: CredentialProcessor = {
        processCredential: async (credential) => {
          next(credential);
        },
      };
      ctx.onDispose(() => space.spaceState.removeCredentialProcessor(processor));
      scheduleTask(ctx, async () => {
        await space.spaceState.addCredentialProcessor(processor);
        if (noTail) {
          close();
        }
      });
    });
  }

  async writeCredentials({ spaceKey, credentials }: WriteCredentialsRequest) {
    const space = this._spaceManager.spaces.get(spaceKey) ?? raise(new SpaceNotFoundError(spaceKey));
    for (const credential of credentials ?? []) {
      if (credential.proof) {
        await space.controlPipeline.writer.write({ credential: { credential } });
      } else {
        invariant(!credential.id, 'Id on unsigned credentials is not allowed');
        invariant(this._identityManager.identity, 'Identity is not available');
        const signer = this._identityManager.identity.getIdentityCredentialSigner();
        invariant(credential.issuer.equals(signer.getIssuer()));
        const signedCredential = await signer.createCredential({
          subject: credential.subject.id,
          assertion: credential.subject.assertion,
        });
        await space.controlPipeline.writer.write({ credential: { credential: signedCredential } });
      }
    }
  }

  async createEpoch({ spaceKey, migration }: CreateEpochRequest) {
    const dataSpaceManager = await this._getDataSpaceManager();
    const space = dataSpaceManager.spaces.get(spaceKey) ?? raise(new SpaceNotFoundError(spaceKey));
    await space.createEpoch({ migration });
  }

  private _serializeSpace(space: DataSpace): Space {
    return {
      spaceKey: space.key,
      state: space.state,
      error: space.error ? encodeError(space.error) : undefined,
      pipeline: {
        currentEpoch: space.automergeSpaceState.lastEpoch,
        appliedEpoch: space.automergeSpaceState.lastEpoch,

        controlFeeds: space.inner.controlPipeline.state.feeds.map((feed) => feed.key),
        currentControlTimeframe: space.inner.controlPipeline.state.timeframe,
        targetControlTimeframe: space.inner.controlPipeline.state.targetTimeframe,
        totalControlTimeframe: space.inner.controlPipeline.state.endTimeframe,

        dataFeeds: undefined,
        startDataTimeframe: undefined,
        currentDataTimeframe: undefined,
        targetDataTimeframe: undefined,
        totalDataTimeframe: undefined,
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
            profile: member.profile ?? {},
          },
          presence:
            member.role === HaloSpaceMember.Role.REMOVED
              ? SpaceMember.PresenceState.REMOVED
              : isMe || peers.length > 0
                ? SpaceMember.PresenceState.ONLINE
                : SpaceMember.PresenceState.OFFLINE,
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
