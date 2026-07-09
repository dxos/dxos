//
// Copyright 2022 DXOS.org
//

import type { AutomergeUrl } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { SubscriptionList, UpdateScheduler, scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import {
  type CredentialProcessor,
  createAdmissionCredentials,
  createDidFromIdentityKey,
  getCredentialAssertion,
} from '@dxos/credentials';
import { raise } from '@dxos/debug';
import { type EchoHost, type SpaceManager } from '@dxos/echo-host';
import { type DatabaseDirectory } from '@dxos/echo-protocol';
import { writeMessages } from '@dxos/feed-store';
import { assertArgument, assertState, invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  ApiError,
  AuthorizationError,
  FeedProtocol,
  IdentityNotInitializedError,
  SpaceNotFoundError,
  encodeError,
} from '@dxos/protocols';
import {
  type AdmitContactRequest,
  type ContactAdmission,
  type CreateEpochRequest,
  type CreateEpochResponse,
  type CreateSpaceRequest,
  type ExportSpaceRequest,
  type ExportSpaceResponse,
  type ImportSpaceRequest,
  type ImportSpaceResponse,
  type JoinBySpaceKeyRequest,
  type JoinSpaceResponse,
  type PostMessageRequest,
  type QueryCredentialsRequest,
  type QuerySpacesResponse,
  type Space,
  SpaceArchive,
  SpaceMember,
  SpaceState,
  type SubscribeMessagesRequest,
  type UpdateMemberRoleRequest,
  type UpdateSpaceRequest,
  type WriteCredentialsRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import { type SpacesService } from '@dxos/protocols/rpc';
import { trace } from '@dxos/tracing';
import { type Provider } from '@dxos/util';

import { type IdentityManager } from '../identity';
import {
  SpaceArchiveWriter,
  detectSpaceArchiveFormat,
  extractSpaceArchive,
  objJsonToObjectStructure,
  readSerializedSpaceArchive,
  writeSerializedSpaceArchive,
} from '../space-export';
import { type DataSpace } from './data-space';
import { type DataSpaceManager } from './data-space-manager';

export class SpacesServiceImpl implements SpacesService.Handlers {
  constructor(
    private readonly _identityManager: IdentityManager,
    private readonly _spaceManager: SpaceManager,
    private readonly _echoHost: EchoHost,
    private readonly _getDataSpaceManager: Provider<Promise<DataSpaceManager>>,
  ) {}

  ['SpacesService.createSpace'](request: CreateSpaceRequest): Effect.Effect<Space, Error> {
    return Effect.tryPromise({
      try: async () => {
        this._requireIdentity();
        const ctx = new Context();
        const dataSpaceManager = await this._getDataSpaceManager();
        const space = await dataSpaceManager.createSpace(ctx, {
          tags: request?.tags,
          membershipPolicy: request?.membershipPolicy,
        });
        await this._updateMetrics();
        return this._serializeSpace(space);
      },
      catch: (error) => error as Error,
    });
  }

  ['SpacesService.updateSpace']({
    spaceKey,
    state,
    edgeReplication,
  }: UpdateSpaceRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        const ctx = Context.default();
        const dataSpaceManager = await this._getDataSpaceManager();
        const space = dataSpaceManager.spaces.get(spaceKey) ?? raise(new SpaceNotFoundError(spaceKey));

        if (state) {
          switch (state) {
            case SpaceState.SPACE_ACTIVE:
              await space.activate(ctx);
              break;

            case SpaceState.SPACE_INACTIVE:
              await space.deactivate(ctx);
              break;

            case SpaceState.SPACE_DELETED:
              await dataSpaceManager.markSpaceDeleted(ctx, spaceKey);
              // The space is removed from the manager; skip any further mutations (e.g. edgeReplication).
              return;
            default:
              throw new ApiError({ message: 'Invalid space state' });
          }
        }

        if (edgeReplication !== undefined) {
          await dataSpaceManager.setSpaceEdgeReplicationSetting(ctx, spaceKey, edgeReplication);
        }
      },
      catch: (error) => error as Error,
    });
  }

  ['SpacesService.updateMemberRole'](request: UpdateMemberRoleRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        const identity = this._requireIdentity();
        const space = this._spaceManager.spaces.get(request.spaceKey);
        if (space == null) {
          throw new SpaceNotFoundError(request.spaceKey);
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
      },
      catch: (error) => error as Error,
    });
  }

  ['SpacesService.querySpaces'](): EffectStream.Stream<QuerySpacesResponse, Error> {
    return EffectStream.async<QuerySpacesResponse, Error>((emit) => {
      const ctx = Context.default();
      const scheduler = new UpdateScheduler(
        ctx,
        async () => {
          const dataSpaceManager = await this._getDataSpaceManager();
          const spaces = await Promise.all(
            Array.from(dataSpaceManager.spaces.values()).map((space) => this._serializeSpace(space)),
          );
          log('update', () => ({ ids: spaces.map((space) => space.id) }));
          await this._updateMetrics();
          void emit.single({ spaces });
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
        void emit.single({ spaces: [] });
      }

      return Effect.promise(() => ctx.dispose());
    });
  }

  ['SpacesService.postMessage']({ spaceKey, channel, message }: PostMessageRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        const dataSpaceManager = await this._getDataSpaceManager();
        const space = dataSpaceManager.spaces.get(spaceKey) ?? raise(new SpaceNotFoundError(spaceKey));
        await space.postMessage(getChannelId(channel), message);
      },
      catch: (error) => error as Error,
    });
  }

  ['SpacesService.subscribeMessages']({
    spaceKey,
    channel,
  }: SubscribeMessagesRequest): EffectStream.Stream<GossipMessage, Error> {
    return EffectStream.async<GossipMessage, Error>((emit) => {
      const ctx = Context.default();
      scheduleTask(ctx, async () => {
        const dataSpaceManager = await this._getDataSpaceManager();
        const space = dataSpaceManager.spaces.get(spaceKey) ?? raise(new SpaceNotFoundError(spaceKey));
        const handle = space.listen(getChannelId(channel), (message) => {
          void emit.single(message);
        });
        ctx.onDispose(() => handle.unsubscribe());
      });

      return Effect.promise(() => ctx.dispose());
    });
  }

  ['SpacesService.queryCredentials']({
    spaceKey,
    noTail,
  }: QueryCredentialsRequest): EffectStream.Stream<Credential, Error> {
    return EffectStream.async<Credential, Error>((emit) => {
      const ctx = Context.default();
      const space = this._spaceManager.spaces.get(spaceKey) ?? raise(new SpaceNotFoundError(spaceKey));

      const processor: CredentialProcessor = {
        processCredential: async (credential) => {
          void emit.single(credential);
        },
      };
      ctx.onDispose(() => space.spaceState.removeCredentialProcessor(processor));
      scheduleTask(ctx, async () => {
        await space.spaceState.addCredentialProcessor(processor);
        if (noTail) {
          void emit.end();
        }
      });

      return Effect.promise(() => ctx.dispose());
    });
  }

  ['SpacesService.writeCredentials']({ spaceKey, credentials }: WriteCredentialsRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
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
      },
      catch: (error) => error as Error,
    });
  }

  ['SpacesService.createEpoch']({
    spaceKey,
    migration,
    automergeRootUrl,
  }: CreateEpochRequest): Effect.Effect<CreateEpochResponse, Error> {
    return Effect.tryPromise({
      try: async () => {
        const dataSpaceManager = await this._getDataSpaceManager();
        const space = dataSpaceManager.spaces.get(spaceKey) ?? raise(new SpaceNotFoundError(spaceKey));
        const result = await space.createEpoch({ migration, newAutomergeRoot: automergeRootUrl });
        return { epochCredential: result?.credential, controlTimeframe: result?.timeframe };
      },
      catch: (error) => error as Error,
    });
  }

  ['SpacesService.admitContact'](request: AdmitContactRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        const dataSpaceManager = await this._getDataSpaceManager();
        await dataSpaceManager.admitMember({
          spaceKey: request.spaceKey,
          identityKey: request.contact.identityKey,
          role: request.role,
        });
      },
      catch: (error) => error as Error,
    });
  }

  ['SpacesService.joinBySpaceKey']({ spaceKey }: JoinBySpaceKeyRequest): Effect.Effect<JoinSpaceResponse, Error> {
    return Effect.tryPromise({
      try: async () => {
        const ctx = Context.default();
        const dataSpaceManager = await this._getDataSpaceManager();
        const credential = await dataSpaceManager.requestSpaceAdmissionCredential(ctx, spaceKey);
        return this._joinByAdmission(ctx, { credential });
      },
      catch: (error) => error as Error,
    });
  }

  ['SpacesService.exportSpace'](request: ExportSpaceRequest): Effect.Effect<ExportSpaceResponse, Error> {
    return Effect.tryPromise({
      try: async () => {
        assertArgument(SpaceId.isValid(request.spaceId), 'spaceId', 'Invalid space ID');

        const dataSpaceManager = await this._getDataSpaceManager();
        const space = dataSpaceManager.getSpaceById(request.spaceId) ?? raise(new Error('Space not found'));

        const format = request.format ?? SpaceArchive.Format.BINARY;
        if (format === SpaceArchive.Format.JSON) {
          const archive = await writeSerializedSpaceArchive({ space, echoHost: this._echoHost });
          return { archive };
        }

        await using writer = await new SpaceArchiveWriter().open();
        await writer.begin({ spaceId: space.id });
        const rootUrl = space.automergeSpaceState.lastEpoch?.subject.assertion.automergeRoot;
        assertState(rootUrl, 'Space does not have a root URL');
        await writer.setCurrentRootUrl(rootUrl);

        for await (const [documentId, data] of space.getAllDocuments()) {
          await writer.writeDocument(documentId, data);
        }

        const feeds = await space.getAllFeeds();
        for (const feed of feeds) {
          const archiveBlocks = feed.blocks.map((block) => ({
            actorId: block.actorId,
            sequence: block.sequence,
            prevActorId: block.prevActorId,
            prevSequence: block.prevSequence,
            position: block.position,
            timestamp: block.timestamp,
            data: Buffer.from(block.data).toString('base64'),
          }));
          await writer.writeFeed(feed.feedId, feed.feedNamespace, archiveBlocks);
        }

        const archive = await writer.finish();
        return { archive };
      },
      catch: (error) => error as Error,
    });
  }

  ['SpacesService.importSpace'](request: ImportSpaceRequest): Effect.Effect<ImportSpaceResponse, Error> {
    return Effect.tryPromise({
      try: async () => {
        const ctx = Context.default();
        const dataSpaceManager = await this._getDataSpaceManager();

        const format = request.archive.format ?? detectSpaceArchiveFormat(request.archive);
        if (format === SpaceArchive.Format.JSON) {
          const serialized = readSerializedSpaceArchive(request.archive);
          const space = await dataSpaceManager.createSpace(ctx, { tags: request.tags });
          await this._hydrateSpaceFromSerialized(space, serialized);
          await this._updateMetrics();
          return { newSpaceId: space.id };
        }

        const extracted = await extractSpaceArchive(request.archive);
        invariant(extracted.metadata.echo?.currentRootUrl, 'Space archive does not contain a root URL');
        const space = await dataSpaceManager.createSpace(ctx, {
          documents: extracted.documents,
          rootUrl: extracted.metadata.echo?.currentRootUrl as AutomergeUrl,
          tags: request.tags,
        });
        await this._updateMetrics();
        return { newSpaceId: space.id };
      },
      catch: (error) => error as Error,
    });
  }

  /**
   * Populate a freshly-created space with the objects and feed messages described in a {@link SerializedSpace}.
   *
   * Objects are written directly into the space's automerge root document as inline
   * {@link EntityStructure} entries; feed messages are appended to the appropriate feed
   * via {@link EchoHost.feedService}.
   */
  private async _hydrateSpaceFromSerialized(
    space: DataSpace,
    serialized: ReturnType<typeof readSerializedSpaceArchive>,
  ): Promise<void> {
    const databaseRoot = space.databaseRoot;
    assertState(databaseRoot, 'Space database root is not ready');

    databaseRoot.handle.change((doc: DatabaseDirectory) => {
      if (!doc.objects) {
        doc.objects = {};
      }
      for (const obj of serialized.objects) {
        doc.objects[obj.id] = objJsonToObjectStructure(obj);
      }
    });

    for (const feed of serialized.feeds ?? []) {
      if (feed.messages.length === 0) {
        continue;
      }

      const namespace =
        feed.namespace === 'trace' ? FeedProtocol.WellKnownNamespaces.trace : FeedProtocol.WellKnownNamespaces.data;
      try {
        await Effect.runPromise(
          this._echoHost.feedService['FeedService.insertIntoFeed']({
            spaceId: space.id,
            feedId: feed.feedObjectId,
            subspaceTag: namespace,
            objects: feed.messages.map((message) => JSON.stringify(message)),
          }),
        );
      } catch (err) {
        log.warn('failed to import feed data', { feedObjectId: feed.feedObjectId, error: err });
      }
    }
  }

  private async _joinByAdmission(ctx: Context, { credential }: ContactAdmission): Promise<JoinSpaceResponse> {
    const assertion = getCredentialAssertion(credential);
    invariant(assertion['@type'] === 'dxos.halo.credentials.SpaceMember', 'Invalid credential');
    const myIdentity = this._identityManager.identity;
    invariant(myIdentity && credential.subject.id.equals(myIdentity.identityKey));

    const dataSpaceManager = await this._getDataSpaceManager();
    let dataSpace = dataSpaceManager.spaces.get(assertion.spaceKey);
    if (!dataSpace) {
      dataSpace = await dataSpaceManager.acceptSpace(ctx, {
        spaceKey: assertion.spaceKey,
        genesisFeedKey: assertion.genesisFeedKey,
        tags: assertion.tags,
      });
      await myIdentity.controlPipeline.writer.write({ credential: { credential } });
    }

    return { space: await this._serializeSpace(dataSpace) };
  }

  private async _serializeSpace(space: DataSpace): Promise<Space> {
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
              identityKey: member.key,
              profile: member.profile ?? {},
            },
            role: member.role,
            presence: peers.length > 0 ? SpaceMember.PresenceState.ONLINE : SpaceMember.PresenceState.OFFLINE,
            peerStates: peers,
          };
        }),
      ),
      creator: space.inner.spaceState.creator?.key,
      tags: space.tags,
      membershipPolicy: space.membershipPolicy,
      cache: space.cache,
      metrics: space.metrics,
      edgeReplication: space.getEdgeReplicationSetting(),
    };
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
