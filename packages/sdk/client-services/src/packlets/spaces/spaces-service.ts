//
// Copyright 2022 DXOS.org
//

import type { AutomergeUrl } from '@automerge/automerge-repo';

import { SubscriptionList, UpdateScheduler, scheduleTask } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import {
  type CredentialProcessor,
  createAdmissionCredentials,
  createDidFromIdentityKey,
  getCredentialAssertion,
} from '@dxos/credentials';
import { raise } from '@dxos/debug';
import { type SpaceManager } from '@dxos/echo-pipeline';
import { writeMessages } from '@dxos/feed-store';
import { assertArgument, assertState, invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  ApiError,
  AuthorizationError,
  type Client,
  create,
  EmptySchema,
  type Empty,
  IdentityNotInitializedError,
  SpaceNotFoundError,
  encodeError,
} from '@dxos/protocols';
import {
  type AdmitContactRequest,
  type ContactAdmission,
  type CreateEpochRequest,
  type CreateEpochResponse,
  CreateEpochResponseSchema,
  type ExportSpaceRequest,
  type ExportSpaceResponse,
  ExportSpaceResponseSchema,
  type ImportSpaceRequest,
  type ImportSpaceResponse,
  ImportSpaceResponseSchema,
  type JoinBySpaceKeyRequest,
  type JoinSpaceResponse,
  JoinSpaceResponseSchema,
  type PostMessageRequest,
  type QueryCredentialsRequest,
  type QuerySpacesResponse,
  QuerySpacesResponseSchema,
  type Space,
  SpaceMember_PresenceState,
  SpaceSchema,
  SpaceState,
  type SubscribeMessagesRequest,
  type UpdateMemberRoleRequest,
  type UpdateSpaceRequest,
  type WriteCredentialsRequest,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type GossipMessage } from '@dxos/protocols/buf/dxos/mesh/teleport/gossip_pb';
import { trace } from '@dxos/tracing';
import { type Provider } from '@dxos/util';

import { type IdentityManager } from '../identity';
import { SpaceArchiveWriter, extractSpaceArchive } from '../space-export';

import { type DataSpace } from './data-space';
import { type DataSpaceManager } from './data-space-manager';

export class SpacesServiceImpl implements Client.SpacesService {
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

  async updateSpace({ spaceKey, state, edgeReplication }: UpdateSpaceRequest): Promise<Empty> {
    const dataSpaceManager = await this._getDataSpaceManager();
    const space = dataSpaceManager.spaces.get(spaceKey as any) ?? raise(new SpaceNotFoundError(spaceKey as any));

    if (state) {
      switch (state) {
        case SpaceState.SPACE_ACTIVE:
          await space.activate();
          break;

        case SpaceState.SPACE_INACTIVE:
          await space.deactivate();
          break;
        default:
          throw new ApiError({ message: 'Invalid space state' });
      }
    }

    if (edgeReplication !== undefined) {
      await dataSpaceManager.setSpaceEdgeReplicationSetting(spaceKey as any, edgeReplication);
    }
    return create(EmptySchema);
  }

  async updateMemberRole(request: UpdateMemberRoleRequest): Promise<Empty> {
    const identity = this._requireIdentity();
    const space = this._spaceManager.spaces.get(request.spaceKey as any);
    if (space == null) {
      throw new SpaceNotFoundError(request.spaceKey as any);
    }
    if (!space.spaceState.hasMembershipManagementPermission(identity.identityKey)) {
      throw new AuthorizationError({
        message: 'No member management permission.',
        context: {
          spaceKey: space.key,
          role: space.spaceState.getMemberRole(identity.identityKey),
        },
      });
    }
    const credentials = await createAdmissionCredentials(
      identity.getIdentityCredentialSigner(),
      request.memberKey as any,
      space.key,
      space.genesisFeedKey,
      request.newRole,
      space.spaceState.membershipChainHeads,
    );
    invariant(credentials[0].credential);
    const spaceMemberCredential = credentials[0].credential.credential;
    invariant(getCredentialAssertion(spaceMemberCredential)['@type'] === 'dxos.halo.credentials.SpaceMember');
    await writeMessages(space.controlPipeline.writer, credentials);
    return create(EmptySchema);
  }

  querySpaces(): Stream<QuerySpacesResponse> {
    return new Stream<QuerySpacesResponse>(({ next, ctx }) => {
      const scheduler = new UpdateScheduler(
        ctx,
        async () => {
          const dataSpaceManager = await this._getDataSpaceManager();
          const spaces = await Promise.all(
            Array.from(dataSpaceManager.spaces.values()).map((space) => this._serializeSpace(space)),
          );
          log('update', () => ({ ids: spaces.map((space) => space.id) }));
          await this._updateMetrics();
          next(create(QuerySpacesResponseSchema, { spaces }));
        },
        { maxFrequency: process.env.NODE_ENV === 'test' ? undefined : 2 },
      );

      scheduleTask(ctx, async () => {
        const dataSpaceManager = await this._getDataSpaceManager();

        const subscriptions = new SubscriptionList();
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

  async postMessage({ spaceKey, channel, message }: PostMessageRequest): Promise<Empty> {
    const dataSpaceManager = await this._getDataSpaceManager();
    const space = dataSpaceManager.spaces.get(spaceKey as any) ?? raise(new SpaceNotFoundError(spaceKey as any));
    await space.postMessage(getChannelId(channel), message);
    return create(EmptySchema);
  }

  subscribeMessages({ spaceKey, channel }: SubscribeMessagesRequest): Stream<GossipMessage> {
    return new Stream<GossipMessage>(({ ctx, next }) => {
      scheduleTask(ctx, async () => {
        const dataSpaceManager = await this._getDataSpaceManager();
        const space = dataSpaceManager.spaces.get(spaceKey as any) ?? raise(new SpaceNotFoundError(spaceKey as any));
        const handle = space.listen(getChannelId(channel), (message) => {
          next(message as any);
        });
        ctx.onDispose(() => handle.unsubscribe());
      });
    });
  }

  queryCredentials(request: QueryCredentialsRequest): Stream<Credential> {
    return new Stream(({ ctx, next, close }) => {
      const space = this._spaceManager.spaces.get(request.spaceKey as any) ?? raise(new SpaceNotFoundError(request.spaceKey as any));

      const processor: CredentialProcessor = {
        processCredential: async (credential) => {
          next(credential as any);
        },
      };
      ctx.onDispose(() => space.spaceState.removeCredentialProcessor(processor));
      scheduleTask(ctx, async () => {
        await space.spaceState.addCredentialProcessor(processor);
        if (request.noTail) {
          close();
        }
      });
    });
  }

  async writeCredentials({ spaceKey, credentials }: WriteCredentialsRequest): Promise<Empty> {
    const space = this._spaceManager.spaces.get(spaceKey as any) ?? raise(new SpaceNotFoundError(spaceKey as any));
    for (const credential of credentials ?? []) {
      if (credential.proof) {
        await space.controlPipeline.writer.write({ credential: { credential: credential as any } });
      } else {
        invariant(!credential.id, 'Id on unsigned credentials is not allowed');
        invariant(this._identityManager.identity, 'Identity is not available');
        const signer = this._identityManager.identity.getIdentityCredentialSigner();
        invariant((credential.issuer as any).equals(signer.getIssuer()));
        const signedCredential = await signer.createCredential({
          subject: (credential.subject as any).id,
          assertion: (credential.subject as any).assertion,
        });
        await space.controlPipeline.writer.write({ credential: { credential: signedCredential } });
      }
    }
    return create(EmptySchema);
  }

  async createEpoch({ spaceKey, migration, automergeRootUrl }: CreateEpochRequest): Promise<CreateEpochResponse> {
    const dataSpaceManager = await this._getDataSpaceManager();
    const space = dataSpaceManager.spaces.get(spaceKey as any) ?? raise(new SpaceNotFoundError(spaceKey as any));
    const result = await space.createEpoch({ migration, newAutomergeRoot: automergeRootUrl });
    return create(CreateEpochResponseSchema, {
      epochCredential: result?.credential as any,
      controlTimeframe: result?.timeframe as any,
    });
  }

  async admitContact(request: AdmitContactRequest): Promise<Empty> {
    const dataSpaceManager = await this._getDataSpaceManager();
    await dataSpaceManager.admitMember({
      spaceKey: request.spaceKey as any,
      identityKey: request.contact?.identityKey as any,
      role: request.role,
    });
    return create(EmptySchema);
  }

  async joinBySpaceKey({ spaceKey }: JoinBySpaceKeyRequest): Promise<JoinSpaceResponse> {
    const dataSpaceManager = await this._getDataSpaceManager();
    const credential = await dataSpaceManager.requestSpaceAdmissionCredential(spaceKey as any);
    return this._joinByAdmission({ credential } as any);
  }

  async exportSpace(request: ExportSpaceRequest): Promise<ExportSpaceResponse> {
    await using writer = await new SpaceArchiveWriter().open();
    assertArgument(SpaceId.isValid(request.spaceId), 'spaceId', 'Invalid space ID');

    const dataSpaceManager = await this._getDataSpaceManager();
    const space = dataSpaceManager.getSpaceById(request.spaceId) ?? raise(new Error('Space not found'));
    await writer.begin({ spaceId: space.id });
    const rootUrl = space.automergeSpaceState.lastEpoch?.subject.assertion.automergeRoot;
    assertState(rootUrl, 'Space does not have a root URL');
    await writer.setCurrentRootUrl(rootUrl);

    for await (const [documentId, data] of space.getAllDocuments()) {
      await writer.writeDocument(documentId, data);
    }

    const archive = await writer.finish();
    return create(ExportSpaceResponseSchema, { archive: archive as any });
  }

  async importSpace(request: ImportSpaceRequest): Promise<ImportSpaceResponse> {
    const dataSpaceManager = await this._getDataSpaceManager();
    const extracted = await extractSpaceArchive(request.archive as any);
    invariant(extracted.metadata.echo?.currentRootUrl, 'Space archive does not contain a root URL');
    const space = await dataSpaceManager.createSpace({
      documents: extracted.documents,
      rootUrl: extracted.metadata.echo?.currentRootUrl as AutomergeUrl,
    });
    await this._updateMetrics();
    return create(ImportSpaceResponseSchema, { newSpaceId: space.id });
  }

  private async _joinByAdmission({ credential }: ContactAdmission): Promise<JoinSpaceResponse> {
    const assertion = getCredentialAssertion(credential as any);
    invariant(assertion['@type'] === 'dxos.halo.credentials.SpaceMember', 'Invalid credential');
    const myIdentity = this._identityManager.identity;
    invariant(myIdentity && (credential as any).subject.id.equals(myIdentity.identityKey));

    const dataSpaceManager = await this._getDataSpaceManager();
    let dataSpace = dataSpaceManager.spaces.get(assertion.spaceKey);
    if (!dataSpace) {
      dataSpace = await dataSpaceManager.acceptSpace({
        spaceKey: assertion.spaceKey,
        genesisFeedKey: assertion.genesisFeedKey,
      });
      await myIdentity.controlPipeline.writer.write({ credential: { credential: credential as any } });
    }

    return create(JoinSpaceResponseSchema, { space: await this._serializeSpace(dataSpace) });
  }

  private async _serializeSpace(space: DataSpace): Promise<Space> {
    return create(SpaceSchema, {
      id: space.id,
      spaceKey: space.key as any,
      state: space.state,
      error: space.error ? encodeError(space.error) as any : undefined,
      pipeline: {
        currentEpoch: space.automergeSpaceState.lastEpoch as any,
        appliedEpoch: space.automergeSpaceState.lastEpoch as any,

        controlFeeds: space.inner.controlPipeline.state.feeds.map((feed) => feed.key) as any,
        currentControlTimeframe: space.inner.controlPipeline.state.timeframe as any,
        targetControlTimeframe: space.inner.controlPipeline.state.targetTimeframe as any,
        totalControlTimeframe: space.inner.controlPipeline.state.endTimeframe as any,

        dataFeeds: undefined,
        startDataTimeframe: undefined,
        currentDataTimeframe: undefined,
        targetDataTimeframe: undefined,
        totalDataTimeframe: undefined,

        spaceRootUrl: space.databaseRoot?.url,
      },
      members: await Promise.all(
        Array.from(space.inner.spaceState.members.values()).map(async (member) => {
          const peers = space.presence.getPeersOnline().filter(({ identityKey }) => identityKey.equals(member.key));
          const isMe = this._identityManager.identity?.identityKey.equals(member.key);

          if (isMe) {
            peers.push(space.presence.getLocalState());
          }

          return {
            identity: {
              did: await createDidFromIdentityKey(member.key),
              identityKey: member.key as any,
              profile: (member.profile ?? {}) as any,
            },
            role: member.role,
            presence: peers.length > 0 ? SpaceMember_PresenceState.ONLINE : SpaceMember_PresenceState.OFFLINE,
            peerStates: peers as any,
          };
        }),
      ),
      creator: space.inner.spaceState.creator?.key as any,
      cache: space.cache as any,
      metrics: space.metrics as any,
      edgeReplication: space.getEdgeReplicationSetting(),
    });
  }

  private _requireIdentity() {
    if (!this._identityManager.identity) {
      throw new IdentityNotInitializedError({
        message: 'This device has no HALO identity available. See https://docs.dxos.org/guide/platform/halo',
      });
    }
    return this._identityManager.identity;
  }

  private async _updateMetrics(): Promise<void> {
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
