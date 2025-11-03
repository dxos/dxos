//
// Copyright 2022 DXOS.org
//

import { type AutomergeUrl, parseAutomergeUrl } from '@automerge/automerge-repo';

import { Trigger, synchronized, trackLeaks } from '@dxos/async';
import { type DelegateInvitationCredential, type MemberInfo, getCredentialAssertion } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { type FeedStore } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type SwarmNetworkManager } from '@dxos/network-manager';
import { trace } from '@dxos/protocols';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { type SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import type { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type Teleport } from '@dxos/teleport';
import { type BlobStore } from '@dxos/teleport-extension-object-sync';
import { ComplexMap } from '@dxos/util';

import { createIdFromSpaceKey } from '../common/space-id';
import { type MetadataStore } from '../metadata';

import { CredentialRetrieverExtension } from './admission-discovery-extension';
import { Space } from './space';
import { SpaceProtocol, type SwarmIdentity } from './space-protocol';

export type SpaceManagerParams = {
  feedStore: FeedStore<FeedMessage>;
  networkManager: SwarmNetworkManager;
  metadataStore: MetadataStore;

  blobStore: BlobStore;

  disableP2pReplication?: boolean;
};

export type ConstructSpaceParams = {
  metadata: SpaceMetadata;
  swarmIdentity: SwarmIdentity;
  memberKey: PublicKey;
  /**
   * Called when connection auth passed successful.
   */
  onAuthorizedConnection: (session: Teleport) => void;
  onAuthFailure?: (session: Teleport) => void;
  onDelegatedInvitationStatusChange: (invitation: DelegateInvitationCredential, isActive: boolean) => Promise<void>;
  onMemberRolesChanged: (member: MemberInfo[]) => Promise<void>;
};

export type RequestSpaceAdmissionCredentialParams = {
  spaceKey: PublicKey;
  identityKey: PublicKey;
  swarmIdentity: SwarmIdentity;
  timeout: number;
};

/**
 * Manages a collection of ECHO (Data) Spaces.
 */
@trackLeaks('open', 'close')
export class SpaceManager {
  private readonly _spaces = new ComplexMap<PublicKey, Space>(PublicKey.hash);
  private readonly _feedStore: FeedStore<FeedMessage>;
  private readonly _networkManager: SwarmNetworkManager;
  private readonly _metadataStore: MetadataStore;
  private readonly _blobStore: BlobStore;
  private readonly _instanceId = PublicKey.random().toHex();
  private readonly _disableP2pReplication: boolean;

  constructor({ feedStore, networkManager, metadataStore, blobStore, disableP2pReplication }: SpaceManagerParams) {
    // TODO(burdon): Assert.
    this._feedStore = feedStore;
    this._networkManager = networkManager;
    this._metadataStore = metadataStore;
    this._blobStore = blobStore;
    this._disableP2pReplication = disableP2pReplication ?? false;
  }

  // TODO(burdon): Remove.
  get spaces() {
    return this._spaces;
  }

  @synchronized
  async open(): Promise<void> {}

  @synchronized
  async close(): Promise<void> {
    await Promise.all([...this._spaces.values()].map((space) => space.close()));
  }

  async constructSpace({
    metadata,
    swarmIdentity,
    onAuthorizedConnection,
    onAuthFailure,
    onDelegatedInvitationStatusChange,
    onMemberRolesChanged,
    memberKey,
  }: ConstructSpaceParams): Promise<Space> {
    log.trace('dxos.echo.space-manager.construct-space', trace.begin({ id: this._instanceId }));
    log('constructing space...', { spaceKey: metadata.genesisFeedKey });

    // The genesis feed will be the same as the control feed if the space was created by the local agent.
    const genesisFeed = await this._feedStore.openFeed(metadata.genesisFeedKey ?? failUndefined());

    const spaceKey = metadata.key;
    const spaceId = await createIdFromSpaceKey(spaceKey);
    const protocol = new SpaceProtocol({
      topic: spaceKey,
      swarmIdentity,
      networkManager: this._networkManager,
      onSessionAuth: onAuthorizedConnection,
      onAuthFailure,
      blobStore: this._blobStore,
      disableP2pReplication: this._disableP2pReplication,
    });

    const space = new Space({
      id: spaceId,
      spaceKey,
      protocol,
      genesisFeed,
      feedProvider: (feedKey, opts) => this._feedStore.openFeed(feedKey, opts),
      metadataStore: this._metadataStore,
      memberKey,
      onDelegatedInvitationStatusChange,
      onMemberRolesChanged,
    });
    this._spaces.set(space.key, space);

    log.trace('dxos.echo.space-manager.construct-space', trace.end({ id: this._instanceId }));
    return space;
  }

  public async requestSpaceAdmissionCredential(params: RequestSpaceAdmissionCredentialParams): Promise<Credential> {
    const traceKey = 'dxos.echo.space-manager.request-space-admission';
    log.trace(traceKey, trace.begin({ id: this._instanceId }));
    log('requesting space admission credential...', { spaceKey: params.spaceKey });

    const onCredentialResolved = new Trigger<Credential>();
    const protocol = new SpaceProtocol({
      topic: params.spaceKey,
      swarmIdentity: params.swarmIdentity,
      networkManager: this._networkManager,
      onSessionAuth: (session: Teleport) => {
        session.addExtension(
          'dxos.mesh.teleport.admission-discovery',
          new CredentialRetrieverExtension(
            { spaceKey: params.spaceKey, memberKey: params.identityKey },
            onCredentialResolved,
          ),
        );
      },
      onAuthFailure: (session: Teleport) => session.close(),
      blobStore: this._blobStore,
      disableP2pReplication: this._disableP2pReplication,
    });

    try {
      await protocol.start();
      const credential = await onCredentialResolved.wait({ timeout: params.timeout });
      log.trace(traceKey, trace.end({ id: this._instanceId }));
      return credential;
    } catch (err: any) {
      log.trace(traceKey, trace.error({ id: this._instanceId, error: err }));
      throw err;
    } finally {
      await protocol.stop();
    }
  }

  public findSpaceByRootDocumentId(documentId: string): Space | undefined {
    return [...this._spaces.values()].find((space) =>
      space.spaceState.credentials.some((credential) => {
        const assertion = getCredentialAssertion(credential);
        if (assertion['@type'] !== 'dxos.halo.credentials.Epoch') {
          return false;
        }
        if (!assertion?.automergeRoot) {
          return false;
        }
        return parseAutomergeUrl(assertion.automergeRoot as AutomergeUrl).documentId === documentId;
      }),
    );
  }
}
