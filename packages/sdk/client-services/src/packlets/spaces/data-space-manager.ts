//
// Copyright 2022 DXOS.org
//

import { Event, synchronized, trackLeaks } from '@dxos/async';
import { type Doc } from '@dxos/automerge/automerge';
import { type AutomergeUrl, type DocHandle } from '@dxos/automerge/automerge-repo';
import { PropertiesType } from '@dxos/client-protocol';
import { Context, cancelWithContext } from '@dxos/context';
import {
  getCredentialAssertion,
  type CredentialSigner,
  type DelegateInvitationCredential,
  type MemberInfo,
} from '@dxos/credentials';
import { findInlineObjectOfType, type EchoHost } from '@dxos/echo-db';
import {
  AuthStatus,
  type MetadataStore,
  type Space,
  type SpaceManager,
  type SpaceProtocol,
  type SpaceProtocolSession,
} from '@dxos/echo-pipeline';
import { encodeReference, type ObjectStructure, type SpaceDoc } from '@dxos/echo-protocol';
import { TYPE_PROPERTIES, getTypeReference } from '@dxos/echo-schema';
import { type FeedStore } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace as Trace } from '@dxos/protocols';
import { Invitation, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { type FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { type SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { SpaceMember, type Credential, type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type DelegateSpaceInvitation } from '@dxos/protocols/proto/dxos/halo/invitations';
import { type PeerState } from '@dxos/protocols/proto/dxos/mesh/presence';
import { Gossip, Presence } from '@dxos/teleport-extension-gossip';
import { type Timeframe } from '@dxos/timeframe';
import { trace } from '@dxos/tracing';
import { ComplexMap, assignDeep, deferFunction, forEachAsync } from '@dxos/util';

import { createAuthProvider } from '../identity';
import { type InvitationsManager } from '../invitations';
import { DataSpace } from './data-space';
import { spaceGenesis } from './genesis';

const PRESENCE_ANNOUNCE_INTERVAL = 10_000;
const PRESENCE_OFFLINE_TIMEOUT = 20_000;

// Space properties key for default metadata.
const DEFAULT_SPACE_KEY = '__DEFAULT__';

export interface SigningContext {
  identityKey: PublicKey;
  deviceKey: PublicKey;
  credentialSigner: CredentialSigner; // TODO(burdon): Already has keyring.
  recordCredential: (credential: Credential) => Promise<void>;
  // TODO(dmaretskyi): Should be a getter.
  getProfile: () => ProfileDocument | undefined;
}

export type AcceptSpaceOptions = {
  spaceKey: PublicKey;
  genesisFeedKey: PublicKey;

  /**
   * Latest known timeframe for the control pipeline.
   * We will try to catch up to this timeframe before starting the data pipeline.
   */
  controlTimeframe?: Timeframe;

  /**
   * Latest known timeframe for the data pipeline.
   * We will try to catch up to this timeframe before initializing the database.
   */
  dataTimeframe?: Timeframe;
};

export type DataSpaceManagerRuntimeParams = {
  spaceMemberPresenceAnnounceInterval?: number;
  spaceMemberPresenceOfflineTimeout?: number;
};

@trackLeaks('open', 'close')
export class DataSpaceManager {
  private readonly _ctx = new Context();

  public readonly updated = new Event();

  private readonly _spaces = new ComplexMap<PublicKey, DataSpace>(PublicKey.hash);

  private _isOpen = false;
  private readonly _instanceId = PublicKey.random().toHex();

  constructor(
    private readonly _spaceManager: SpaceManager,
    private readonly _metadataStore: MetadataStore,
    private readonly _keyring: Keyring,
    private readonly _signingContext: SigningContext,
    private readonly _feedStore: FeedStore<FeedMessage>,
    private readonly _echoHost: EchoHost,
    private readonly _invitationsManager: InvitationsManager,
    private readonly _params?: DataSpaceManagerRuntimeParams,
  ) {
    trace.diagnostic({
      id: 'spaces',
      name: 'Spaces',
      fetch: async () => {
        return Array.from(this._spaces.values()).map((space) => {
          const rootUrl = space.automergeSpaceState.rootUrl;
          const rootHandle = rootUrl ? this._echoHost.automergeRepo.find(rootUrl as AutomergeUrl) : undefined;
          const rootDoc = rootHandle?.docSync() as Doc<SpaceDoc> | undefined;

          const properties = rootDoc && findInlineObjectOfType(rootDoc, TYPE_PROPERTIES);

          return {
            key: space.key.toHex(),
            state: SpaceState[space.state],
            name: properties?.[1].data.name ?? null,
            inlineObjects: rootDoc ? Object.keys(rootDoc.objects ?? {}).length : null,
            linkedObjects: rootDoc ? Object.keys(rootDoc.links ?? {}).length : null,
            credentials: space.inner.spaceState.credentials.length,
            members: space.inner.spaceState.members.size,
            rootUrl,
          };
        });
      },
    });
  }

  // TODO(burdon): Remove.
  get spaces() {
    return this._spaces;
  }

  @synchronized
  async open() {
    log('open');
    log.trace('dxos.echo.data-space-manager.open', Trace.begin({ id: this._instanceId }));
    log('metadata loaded', { spaces: this._metadataStore.spaces.length });

    await forEachAsync(this._metadataStore.spaces, async (spaceMetadata) => {
      try {
        log('load space', { spaceMetadata });
        await this._constructSpace(spaceMetadata);
      } catch (err) {
        log.error('Error loading space', { spaceMetadata, err });
      }
    });

    this._isOpen = true;
    this.updated.emit();

    log.trace('dxos.echo.data-space-manager.open', Trace.end({ id: this._instanceId }));
  }

  @synchronized
  async close() {
    log('close');
    this._isOpen = false;
    await this._ctx.dispose();
    for (const space of this._spaces.values()) {
      await space.close();
    }
    this._spaces.clear();
  }

  /**
   * Creates a new space writing the genesis credentials to the control feed.
   */
  @synchronized
  async createSpace() {
    invariant(this._isOpen, 'Not open.');
    const spaceKey = await this._keyring.createKey();
    const controlFeedKey = await this._keyring.createKey();
    const dataFeedKey = await this._keyring.createKey();
    const metadata: SpaceMetadata = {
      key: spaceKey,
      genesisFeedKey: controlFeedKey,
      controlFeedKey,
      dataFeedKey,
      state: SpaceState.ACTIVE,
    };

    log('creating space...', { spaceKey });

    const root = await this._echoHost.createSpaceRoot(spaceKey);
    const space = await this._constructSpace(metadata);
    await space.open();

    const credentials = await spaceGenesis(this._keyring, this._signingContext, space.inner, root.url);
    await this._metadataStore.addSpace(metadata);

    const memberCredential = credentials[1];
    invariant(getCredentialAssertion(memberCredential)['@type'] === 'dxos.halo.credentials.SpaceMember');
    await this._signingContext.recordCredential(memberCredential);

    await space.initializeDataPipeline();

    this.updated.emit();
    return space;
  }

  async isDefaultSpace(space: DataSpace): Promise<boolean> {
    const rootDoc = await this._getSpaceRootDocument(space);
    const [_, properties] = findInlineObjectOfType(rootDoc.docSync(), TYPE_PROPERTIES) ?? [];
    return properties?.data?.[DEFAULT_SPACE_KEY] === this._signingContext.identityKey.toHex();
  }

  async createDefaultSpace() {
    const space = await this.createSpace();
    const document = await this._getSpaceRootDocument(space);

    // TODO(dmaretskyi): Better API for low-level data access.
    const properties: ObjectStructure = {
      system: {
        type: encodeReference(getTypeReference(PropertiesType)!),
      },
      data: {
        [DEFAULT_SPACE_KEY]: this._signingContext.identityKey.toHex(),
      },
      meta: {
        keys: [],
      },
    };

    const propertiesId = PublicKey.random().toHex();
    document.change((doc: SpaceDoc) => {
      assignDeep(doc, ['objects', propertiesId], properties);
    });

    await this._echoHost.flush();
    return space;
  }

  private async _getSpaceRootDocument(space: DataSpace): Promise<DocHandle<SpaceDoc>> {
    const automergeIndex = space.automergeSpaceState.rootUrl;
    invariant(automergeIndex);
    const document = this._echoHost.automergeRepo.find<SpaceDoc>(automergeIndex as any);
    await document.whenReady();
    return document;
  }

  // TODO(burdon): Rename join space.
  @synchronized
  async acceptSpace(opts: AcceptSpaceOptions): Promise<DataSpace> {
    log('accept space', { opts });
    invariant(this._isOpen, 'Not open.');
    invariant(!this._spaces.has(opts.spaceKey), 'Space already exists.');

    const metadata: SpaceMetadata = {
      key: opts.spaceKey,
      genesisFeedKey: opts.genesisFeedKey,
      controlTimeframe: opts.controlTimeframe,
      dataTimeframe: opts.dataTimeframe,
    };

    const space = await this._constructSpace(metadata);
    await space.open();
    await this._metadataStore.addSpace(metadata);
    space.initializeDataPipelineAsync();

    this.updated.emit();
    return space;
  }

  /**
   * Wait until the space data pipeline is fully initialized.
   * Used by invitation handler.
   * TODO(dmaretskyi): Consider removing.
   */
  async waitUntilSpaceReady(spaceKey: PublicKey) {
    await cancelWithContext(
      this._ctx,
      this.updated.waitForCondition(() => {
        const space = this._spaces.get(spaceKey);
        return !!space && space.state === SpaceState.READY;
      }),
    );
  }

  private async _constructSpace(metadata: SpaceMetadata) {
    log('construct space', { metadata });
    const gossip = new Gossip({
      localPeerId: this._signingContext.deviceKey,
    });
    const presence = new Presence({
      announceInterval: this._params?.spaceMemberPresenceAnnounceInterval ?? PRESENCE_ANNOUNCE_INTERVAL,
      offlineTimeout: this._params?.spaceMemberPresenceOfflineTimeout ?? PRESENCE_OFFLINE_TIMEOUT,
      identityKey: this._signingContext.identityKey,
      gossip,
    });

    const controlFeed =
      metadata.controlFeedKey && (await this._feedStore.openFeed(metadata.controlFeedKey, { writable: true }));
    const dataFeed =
      metadata.dataFeedKey &&
      (await this._feedStore.openFeed(metadata.dataFeedKey, {
        writable: true,
        sparse: true,
      }));

    const space: Space = await this._spaceManager.constructSpace({
      metadata,
      swarmIdentity: {
        peerKey: this._signingContext.deviceKey,
        credentialProvider: createAuthProvider(this._signingContext.credentialSigner),
        credentialAuthenticator: deferFunction(() => dataSpace.authVerifier.verifier),
      },
      onAuthorizedConnection: (session) => {
        session.addExtension(
          'dxos.mesh.teleport.gossip',
          gossip.createExtension({ remotePeerId: session.remotePeerId }),
        );
        session.addExtension('dxos.mesh.teleport.notarization', dataSpace.notarizationPlugin.createExtension());
        this._echoHost.authorizeDevice(space.key, session.remotePeerId);
        session.addExtension('dxos.mesh.teleport.automerge', this._echoHost.createReplicationExtension());
      },
      onAuthFailure: () => {
        log.warn('auth failure');
      },
      onMemberRolesChanged: async (members: MemberInfo[]) => {
        if (dataSpace?.state === SpaceState.READY) {
          this._handleMemberRoleChanges(presence, space.protocol, members);
        }
      },
      memberKey: this._signingContext.identityKey,
      onDelegatedInvitationStatusChange: (invitation, isActive) => {
        return this._handleInvitationStatusChange(dataSpace, invitation, isActive);
      },
    });
    controlFeed && (await space.setControlFeed(controlFeed));
    dataFeed && (await space.setDataFeed(dataFeed));

    const dataSpace = new DataSpace({
      inner: space,
      initialState: metadata.state === SpaceState.INACTIVE ? SpaceState.INACTIVE : SpaceState.CLOSED,
      metadataStore: this._metadataStore,
      gossip,
      presence,
      keyring: this._keyring,
      feedStore: this._feedStore,
      echoHost: this._echoHost,
      signingContext: this._signingContext,
      callbacks: {
        beforeReady: async () => {
          log('before space ready', { space: space.key });
        },
        afterReady: async () => {
          log('after space ready', { space: space.key, open: this._isOpen });
          if (this._isOpen) {
            await this._createDelegatedInvitations(dataSpace, [...space.spaceState.invitations.entries()]);
            this._handleMemberRoleChanges(presence, space.protocol, [...space.spaceState.members.values()]);
            this.updated.emit();
          }
        },
        beforeClose: async () => {
          log('before space close', { space: space.key });
        },
      },
      cache: metadata.cache,
    });

    presence.newPeer.on((peerState) => {
      if (dataSpace.state === SpaceState.READY) {
        this._handleNewPeerConnected(space, peerState);
      }
    });

    if (metadata.controlTimeframe) {
      dataSpace.inner.controlPipeline.state.setTargetTimeframe(metadata.controlTimeframe);
    }

    this._spaces.set(metadata.key, dataSpace);
    return dataSpace;
  }

  private _handleMemberRoleChanges(presence: Presence, spaceProtocol: SpaceProtocol, memberInfo: MemberInfo[]): void {
    let closedSessions = 0;
    for (const member of memberInfo) {
      if (member.key.equals(presence.getLocalState().identityKey)) {
        continue;
      }
      const peers = presence.getPeersByIdentityKey(member.key);
      const sessions = peers.map((p) => p.peerId && spaceProtocol.sessions.get(p.peerId));
      const sessionsToClose = sessions.filter((s): s is SpaceProtocolSession => {
        return (s && (member.role === SpaceMember.Role.REMOVED) !== (s.authStatus === AuthStatus.FAILURE)) ?? false;
      });
      sessionsToClose.forEach((session) => {
        void session.close().catch(log.error);
      });
      closedSessions += sessionsToClose.length;
    }
    log('processed member role changes', {
      roleChangeCount: memberInfo.length,
      peersOnline: presence.getPeersOnline().length,
      closedSessions,
    });
    // Handle the case when there was a removed peer online, we can now establish a connection with them
    spaceProtocol.updateTopology();
  }

  private _handleNewPeerConnected(space: Space, peerState: PeerState): void {
    const role = space.spaceState.getMemberRole(peerState.identityKey);
    if (role === SpaceMember.Role.REMOVED) {
      const session = peerState.peerId && space.protocol.sessions.get(peerState.peerId);
      if (session != null) {
        log('closing a session with a removed peer', { peerId: peerState.peerId });
        void session.close().catch(log.error);
      }
    }
  }

  private async _handleInvitationStatusChange(
    dataSpace: DataSpace | undefined,
    delegatedInvitation: DelegateInvitationCredential,
    isActive: boolean,
  ): Promise<void> {
    if (dataSpace?.state !== SpaceState.READY) {
      return;
    }
    if (isActive) {
      await this._createDelegatedInvitations(dataSpace, [
        [delegatedInvitation.credentialId, delegatedInvitation.invitation],
      ]);
    } else {
      await this._invitationsManager.cancelInvitation(delegatedInvitation.invitation);
    }
  }

  private async _createDelegatedInvitations(
    space: DataSpace,
    invitations: Array<[PublicKey, DelegateSpaceInvitation]>,
  ): Promise<void> {
    const tasks = invitations.map(([credentialId, invitation]) => {
      return this._invitationsManager.createInvitation({
        type: Invitation.Type.DELEGATED,
        kind: Invitation.Kind.SPACE,
        spaceKey: space.key,
        authMethod: invitation.authMethod,
        invitationId: invitation.invitationId,
        swarmKey: invitation.swarmKey,
        guestKeypair: invitation.guestKey ? { publicKey: invitation.guestKey } : undefined,
        lifetime: invitation.expiresOn ? invitation.expiresOn.getTime() - Date.now() : undefined,
        multiUse: invitation.multiUse,
        delegationCredentialId: credentialId,
        persistent: false,
      });
    });
    await Promise.all(tasks);
  }
}
