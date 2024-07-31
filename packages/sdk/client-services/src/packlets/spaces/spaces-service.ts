//
// Copyright 2022 DXOS.org
//

import { EventSubscriptions, UpdateScheduler, scheduleTask } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { createAdmissionCredentials, type CredentialProcessor, getCredentialAssertion } from '@dxos/credentials';
import { raise } from '@dxos/debug';
import { type SpaceManager } from '@dxos/echo-pipeline';
import { writeMessages } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import {
  ApiError,
  SpaceNotFoundError,
  encodeError,
  IdentityNotInitializedError,
  AuthorizationError,
} from '@dxos/protocols';
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
  type AdmitContactRequest,
  type ContactAdmission,
  type JoinSpaceResponse,
  type JoinBySpaceKeyRequest,
  type CreateEpochResponse,
} from '@dxos/protocols/proto/dxos/client/services';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import { trace } from '@dxos/tracing';
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
    this._requireIdentity();
    const dataSpaceManager = await this._getDataSpaceManager();
    const space = await dataSpaceManager.createSpace();
    await this._updateMetrics();
    return this._serializeSpace(space);
  }

  async updateSpace({ spaceKey, state }: UpdateSpaceRequest) {
    const dataSpaceManager = await this._getDataSpaceManager();
    const space = dataSpaceManager.spaces.get(spaceKey) ?? raise(new SpaceNotFoundError(spaceKey));

    if (state) {
      switch (state) {
        case SpaceState.SPACE_ACTIVE:
          await space.activate();
          break;

        case SpaceState.SPACE_INACTIVE:
          await space.deactivate();
          break;
        default:
          throw new ApiError('Invalid space state');
      }
    }
  }

  async updateMemberRole(request: UpdateMemberRoleRequest): Promise<void> {
    const identity = this._requireIdentity();
    const space = this._spaceManager.spaces.get(request.spaceKey);
    if (space == null) {
      throw new SpaceNotFoundError(request.spaceKey);
    }
    if (!space.spaceState.hasMembershipManagementPermission(identity.identityKey)) {
      throw new AuthorizationError('No member management permission.', {
        spaceKey: space.key,
        role: space.spaceState.getMemberRole(identity.identityKey),
      });
    }
    const credentials = await createAdmissionCredentials(
      identity.getIdentityCredentialSigner(),
      request.memberKey,
      space.key,
      space.genesisFeedKey,
      request.newRole,
      space.spaceState.membershipChainHeads,
    );
    invariant(credentials[0].credential);
    const spaceMemberCredential = credentials[0].credential.credential;
    invariant(getCredentialAssertion(spaceMemberCredential)['@type'] === 'dxos.halo.credentials.SpaceMember');
    await writeMessages(space.controlPipeline.writer, credentials);
  }

  querySpaces(): Stream<QuerySpacesResponse> {
    return new Stream<QuerySpacesResponse>(({ next, ctx }) => {
      const scheduler = new UpdateScheduler(
        ctx,
        async () => {
          const dataSpaceManager = await this._getDataSpaceManager();
          const spaces = Array.from(dataSpaceManager.spaces.values()).map((space) => this._serializeSpace(space));
          log('update', () => ({ ids: spaces.map((space) => space.id) }));
          await this._updateMetrics();
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
            let lastState: SpaceState | undefined;
            subscriptions.add(
              space.stateUpdate.on(ctx, () => {
                // Always send a separate update if the space state has changed.
                if (space.state !== lastState) {
                  scheduler.forceTrigger();
                } else {
                  scheduler.trigger();
                }
                lastState = space.state;
              }),
            );

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

  async createEpoch({ spaceKey, migration, automergeRootUrl }: CreateEpochRequest): Promise<CreateEpochResponse> {
    const dataSpaceManager = await this._getDataSpaceManager();
    const space = dataSpaceManager.spaces.get(spaceKey) ?? raise(new SpaceNotFoundError(spaceKey));
    const result = await space.createEpoch({ migration, newAutomergeRoot: automergeRootUrl });
    return { epochCredential: result?.credential, controlTimeframe: result?.timeframe };
  }

  async admitContact(request: AdmitContactRequest): Promise<void> {
    const dataSpaceManager = await this._getDataSpaceManager();
    await dataSpaceManager.admitMember({
      spaceKey: request.spaceKey,
      identityKey: request.contact.identityKey,
      role: request.role,
    });
  }

  async joinBySpaceKey({ spaceKey }: JoinBySpaceKeyRequest): Promise<JoinSpaceResponse> {
    const dataSpaceManager = await this._getDataSpaceManager();
    const credential = await dataSpaceManager.requestSpaceAdmissionCredential(spaceKey);
    return this._joinByAdmission({ credential });
  }

  private async _joinByAdmission({ credential }: ContactAdmission): Promise<JoinSpaceResponse> {
    const assertion = getCredentialAssertion(credential);
    invariant(assertion['@type'] === 'dxos.halo.credentials.SpaceMember', 'Invalid credential');
    const myIdentity = this._identityManager.identity;
    invariant(myIdentity && credential.subject.id.equals(myIdentity.identityKey));

    const dataSpaceManager = await this._getDataSpaceManager();
    let dataSpace = dataSpaceManager.spaces.get(assertion.spaceKey);
    if (!dataSpace) {
      dataSpace = await dataSpaceManager.acceptSpace({
        spaceKey: assertion.spaceKey,
        genesisFeedKey: assertion.genesisFeedKey,
      });
      await myIdentity.controlPipeline.writer.write({ credential: { credential } });
    }

    return { space: this._serializeSpace(dataSpace) };
  }

  private _serializeSpace(space: DataSpace): Space {
    return {
      id: space.id,
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

        spaceRootUrl: space.databaseRoot?.url,
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
          role: member.role,
          presence: peers.length > 0 ? SpaceMember.PresenceState.ONLINE : SpaceMember.PresenceState.OFFLINE,
          peerStates: peers,
        };
      }),
      creator: space.inner.spaceState.creator?.key,
      cache: space.cache,
      metrics: space.metrics,
    };
  }

  private _requireIdentity() {
    if (!this._identityManager.identity) {
      throw new IdentityNotInitializedError(
        'This device has no HALO identity available. See https://docs.dxos.org/guide/platform/halo',
      );
    }
    return this._identityManager.identity;
  }

  private async _updateMetrics() {
    const dataSpaceManager = await this._getDataSpaceManager();
    const identity = this._identityManager.identity?.identityKey.truncate();
    if (identity) {
      trace.metrics.gauge('dxos.echo.space.count', dataSpaceManager.spaces.size, {
        tags: { identity },
      });
    }
  }
}

// Add `user-channel` prefix to the channel name, so that it doesn't collide with the internal channels.
const getChannelId = (channel: string): string => `user-channel/${channel}`;
