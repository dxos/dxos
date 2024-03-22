//
// Copyright 2022 DXOS.org
//

import { Event, synchronized, trackLeaks } from '@dxos/async';
import { Context, cancelWithContext } from '@dxos/context';
import { getCredentialAssertion, type CredentialSigner } from '@dxos/credentials';
import { type AutomergeHost, type MetadataStore, type Space, type SpaceManager } from '@dxos/echo-pipeline';
import { type FeedStore } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/protocols';
import { SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { type FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { type SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { type Credential, type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Gossip, Presence } from '@dxos/teleport-extension-gossip';
import { type Timeframe } from '@dxos/timeframe';
import { ComplexMap, deferFunction, forEachAsync } from '@dxos/util';

import { DataSpace } from './data-space';
import { spaceGenesis } from './genesis';
import { createAuthProvider } from '../identity';

const PRESENCE_ANNOUNCE_INTERVAL = 10_000;
const PRESENCE_OFFLINE_TIMEOUT = 20_000;

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
  private readonly _spaceMemberPresenceAnnounceInterval: number;
  private readonly _spaceMemberPresenceOfflineTimeout: number;

  constructor(
    private readonly _spaceManager: SpaceManager,
    private readonly _metadataStore: MetadataStore,
    private readonly _keyring: Keyring,
    private readonly _signingContext: SigningContext,
    private readonly _feedStore: FeedStore<FeedMessage>,
    private readonly _automergeHost: AutomergeHost,
    params?: DataSpaceManagerRuntimeParams,
  ) {
    const {
      spaceMemberPresenceAnnounceInterval = PRESENCE_ANNOUNCE_INTERVAL,
      spaceMemberPresenceOfflineTimeout = PRESENCE_OFFLINE_TIMEOUT,
    } = params ?? {};
    this._spaceMemberPresenceAnnounceInterval = spaceMemberPresenceAnnounceInterval;
    this._spaceMemberPresenceOfflineTimeout = spaceMemberPresenceOfflineTimeout;
  }

  // TODO(burdon): Remove.
  get spaces() {
    return this._spaces;
  }

  @synchronized
  async open() {
    log('open');
    log.trace('dxos.echo.data-space-manager.open', trace.begin({ id: this._instanceId }));
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

    for (const space of this._spaces.values()) {
      if (space.state !== SpaceState.INACTIVE) {
        space.initializeDataPipelineAsync();
      }
    }

    log.trace('dxos.echo.data-space-manager.open', trace.end({ id: this._instanceId }));
  }

  @synchronized
  async close() {
    log('close');
    this._isOpen = false;
    await this._ctx.dispose();
    for (const space of this._spaces.values()) {
      await space.close();
    }
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

    const automergeRoot = this._automergeHost.repo.create();
    automergeRoot.change((doc: any) => {
      doc.access = { spaceKey: spaceKey.toHex() };
    });

    const space = await this._constructSpace(metadata);

    const credentials = await spaceGenesis(this._keyring, this._signingContext, space.inner, automergeRoot.url);
    await this._metadataStore.addSpace(metadata);

    const memberCredential = credentials[1];
    invariant(getCredentialAssertion(memberCredential)['@type'] === 'dxos.halo.credentials.SpaceMember');
    await this._signingContext.recordCredential(memberCredential);

    await space.initializeDataPipeline();

    this.updated.emit();
    return space;
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
      announceInterval: this._spaceMemberPresenceAnnounceInterval,
      offlineTimeout: this._spaceMemberPresenceOfflineTimeout,
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
        this._automergeHost.authorizeDevice(space.key, session.remotePeerId);
        session.addExtension('dxos.mesh.teleport.automerge', this._automergeHost.createExtension());
      },
      onAuthFailure: () => {
        log.warn('auth failure');
      },
      memberKey: this._signingContext.identityKey,
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
      signingContext: this._signingContext,
      callbacks: {
        beforeReady: async () => {
          log('before space ready', { space: space.key });
        },
        afterReady: async () => {
          log('after space ready', { space: space.key, open: this._isOpen });
          if (this._isOpen) {
            this.updated.emit();
          }
        },
        beforeClose: async () => {
          log('before space close', { space: space.key });
        },
      },
      cache: metadata.cache,
      automergeHost: this._automergeHost,
    });

    if (metadata.state !== SpaceState.INACTIVE) {
      await dataSpace.open();
    }

    if (metadata.controlTimeframe) {
      dataSpace.inner.controlPipeline.state.setTargetTimeframe(metadata.controlTimeframe);
    }

    this._spaces.set(metadata.key, dataSpace);
    return dataSpace;
  }
}
