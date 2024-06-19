//
// Copyright 2022 DXOS.org
//

import { Event, Mutex, scheduleTask, sleep, synchronized, trackLeaks } from '@dxos/async';
import { AUTH_TIMEOUT } from '@dxos/client-protocol';
import { Context, ContextDisposedError, cancelWithContext } from '@dxos/context';
import { timed, warnAfterTimeout } from '@dxos/debug';
import { type EchoHost } from '@dxos/echo-db';
import { createMappedFeedWriter, type MetadataStore, type Space } from '@dxos/echo-pipeline';
import { SpaceDocVersion } from '@dxos/echo-protocol';
import { type FeedStore } from '@dxos/feed-store';
import { failedInvariant } from '@dxos/invariant';
import { type Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { CancelledError, SystemError } from '@dxos/protocols';
import {
  type CreateEpochRequest,
  SpaceState,
  type Space as SpaceProto,
} from '@dxos/protocols/proto/dxos/client/services';
import { type FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { type SpaceCache } from '@dxos/protocols/proto/dxos/echo/metadata';
import {
  AdmittedFeed,
  SpaceMember,
  type Credential,
  type Epoch,
  type ProfileDocument,
} from '@dxos/protocols/proto/dxos/halo/credentials';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import { type Gossip, type Presence } from '@dxos/teleport-extension-gossip';
import { Timeframe } from '@dxos/timeframe';
import { trace } from '@dxos/tracing';
import { ComplexSet } from '@dxos/util';

import { AutomergeSpaceState } from './automerge-space-state';
import { type SigningContext } from './data-space-manager';
import { runEpochMigration } from './epoch-migrations';
import { NotarizationPlugin } from './notarization-plugin';
import { TrustedKeySetAuthVerifier } from '../identity';

export type DataSpaceCallbacks = {
  /**
   * Called before transitioning to the ready state.
   */
  beforeReady?: () => Promise<void>;

  /**
   * Called after transitioning to the ready state.
   */
  afterReady?: () => Promise<void>;

  /**
   * Called before space gets closed.
   */
  beforeClose?: () => Promise<void>;
};

export type DataSpaceParams = {
  initialState: SpaceState;
  inner: Space;
  metadataStore: MetadataStore;
  gossip: Gossip;
  presence: Presence;
  keyring: Keyring;
  feedStore: FeedStore<FeedMessage>;
  echoHost: EchoHost;
  signingContext: SigningContext;
  callbacks?: DataSpaceCallbacks;
  cache?: SpaceCache;
};

export type CreateEpochOptions = {
  migration?: CreateEpochRequest.Migration;
  newAutomergeRoot?: string;
};

@trackLeaks('open', 'close')
@trace.resource()
export class DataSpace {
  private _ctx = new Context();
  @trace.info()
  private readonly _inner: Space;

  private readonly _gossip: Gossip;
  private readonly _presence: Presence;
  private readonly _keyring: Keyring;
  private readonly _feedStore: FeedStore<FeedMessage>;
  private readonly _metadataStore: MetadataStore;
  private readonly _signingContext: SigningContext;
  private readonly _notarizationPlugin = new NotarizationPlugin();
  private readonly _callbacks: DataSpaceCallbacks;
  private readonly _cache?: SpaceCache = undefined;
  private readonly _echoHost: EchoHost;

  // TODO(dmaretskyi): Move into Space?
  private readonly _automergeSpaceState = new AutomergeSpaceState((rootUrl) => this._onNewAutomergeRoot(rootUrl));

  private readonly _epochProcessingMutex = new Mutex();

  private _state = SpaceState.CLOSED;

  /**
   * Error for _state === SpaceState.ERROR.
   */
  public error: Error | undefined = undefined;

  public readonly authVerifier: TrustedKeySetAuthVerifier;
  public readonly stateUpdate = new Event();

  public metrics: SpaceProto.Metrics = {};

  constructor(params: DataSpaceParams) {
    this._inner = params.inner;
    this._inner.stateUpdate.on(this._ctx, () => this.stateUpdate.emit());

    this._gossip = params.gossip;
    this._presence = params.presence;
    this._keyring = params.keyring;
    this._feedStore = params.feedStore;
    this._metadataStore = params.metadataStore;
    this._signingContext = params.signingContext;
    this._callbacks = params.callbacks ?? {};
    this._echoHost = params.echoHost;

    this.authVerifier = new TrustedKeySetAuthVerifier({
      trustedKeysProvider: () =>
        new ComplexSet(
          PublicKey.hash,
          Array.from(this._inner.spaceState.members.values())
            .filter((member) => member.role !== SpaceMember.Role.REMOVED)
            .map((member) => member.key),
        ),
      update: this._inner.stateUpdate,
      authTimeout: AUTH_TIMEOUT,
    });

    this._cache = params.cache;

    this._state = params.initialState;
    log('new state', { state: SpaceState[this._state] });
  }

  @trace.info()
  get id() {
    return this._inner.id;
  }

  @trace.info()
  get key() {
    return this._inner.key;
  }

  get isOpen() {
    return this._inner.isOpen;
  }

  @trace.info({ enum: SpaceState })
  get state(): SpaceState {
    return this._state;
  }

  // TODO(burdon): Can we mark this for debugging only?
  get inner() {
    return this._inner;
  }

  get presence() {
    return this._presence;
  }

  get notarizationPlugin() {
    return this._notarizationPlugin;
  }

  get cache() {
    return this._cache;
  }

  get automergeSpaceState() {
    return this._automergeSpaceState;
  }

  @trace.info({ depth: null })
  private get _automergeInfo() {
    return {
      rootUrl: this._automergeSpaceState.rootUrl,
      lastEpoch: this._automergeSpaceState.lastEpoch,
    };
  }

  @synchronized
  async open() {
    if (this._state === SpaceState.CLOSED) {
      await this._open();
    }
  }

  private async _open() {
    await this._presence.open();
    await this._gossip.open();
    await this._notarizationPlugin.open();
    await this._inner.spaceState.addCredentialProcessor(this._notarizationPlugin);
    await this._automergeSpaceState.open();
    await this._inner.spaceState.addCredentialProcessor(this._automergeSpaceState);
    await this._inner.open(new Context());
    this._state = SpaceState.CONTROL_ONLY;
    log('new state', { state: SpaceState[this._state] });
    this.stateUpdate.emit();
    this.metrics = {};
    this.metrics.open = new Date();
  }

  @synchronized
  async close() {
    await this._close();
  }

  private async _close() {
    await this._callbacks.beforeClose?.();
    this._state = SpaceState.CLOSED;
    log('new state', { state: SpaceState[this._state] });
    await this._ctx.dispose();
    this._ctx = new Context();

    await this.authVerifier.close();

    await this._inner.close();
    await this._inner.spaceState.removeCredentialProcessor(this._automergeSpaceState);
    await this._automergeSpaceState.close();
    await this._inner.spaceState.removeCredentialProcessor(this._notarizationPlugin);
    await this._notarizationPlugin.close();

    await this._presence.close();
    await this._gossip.close();
  }

  async postMessage(channel: string, message: any) {
    return this._gossip.postMessage(channel, message);
  }

  listen(channel: string, callback: (message: GossipMessage) => void) {
    return this._gossip.listen(channel, callback);
  }

  /**
   * Initialize the data pipeline in a separate task.
   */
  initializeDataPipelineAsync() {
    scheduleTask(this._ctx, async () => {
      try {
        this.metrics.pipelineInitBegin = new Date();
        await this.initializeDataPipeline();
      } catch (err) {
        if (err instanceof CancelledError || err instanceof ContextDisposedError) {
          log('data pipeline initialization cancelled', err);
          return;
        }

        log.error('Error initializing data pipeline', err);
        this._state = SpaceState.ERROR;
        log('new state', { state: SpaceState[this._state] });
        this.error = err as Error;
        this.stateUpdate.emit();
      } finally {
        this.metrics.ready = new Date();
      }
    });
  }

  @trace.span({ showInBrowserTimeline: true })
  async initializeDataPipeline() {
    if (this._state !== SpaceState.CONTROL_ONLY) {
      throw new SystemError('Invalid operation');
    }

    this._state = SpaceState.INITIALIZING;
    log('new state', { state: SpaceState[this._state] });

    await this._initializeAndReadControlPipeline();

    // Allow other tasks to run before loading the data pipeline.
    await sleep(1);

    const ready = this.stateUpdate.waitForCondition(() => this._state === SpaceState.READY);

    this._automergeSpaceState.startProcessingRootDocs();

    await ready;
  }

  private async _enterReadyState() {
    await this._callbacks.beforeReady?.();

    this._state = SpaceState.READY;
    log('new state', { state: SpaceState[this._state] });
    this.stateUpdate.emit();

    await this._callbacks.afterReady?.();
  }

  @trace.span({ showInBrowserTimeline: true })
  private async _initializeAndReadControlPipeline() {
    await this._inner.controlPipeline.state.waitUntilReachedTargetTimeframe({
      ctx: this._ctx,
      breakOnStall: false,
    });

    this.metrics.controlPipelineReady = new Date();

    await this._createWritableFeeds();
    log('writable feeds created');
    this.stateUpdate.emit();

    if (!this.notarizationPlugin.hasWriter) {
      this.notarizationPlugin.setWriter(
        createMappedFeedWriter<Credential, FeedMessage.Payload>(
          (credential) => ({
            credential: { credential },
          }),
          this._inner.controlPipeline.writer,
        ),
      );
    }
  }

  @timed(10_000)
  private async _createWritableFeeds() {
    const credentials: Credential[] = [];
    if (!this.inner.controlFeedKey) {
      const controlFeed = await this._feedStore.openFeed(await this._keyring.createKey(), { writable: true });
      await this.inner.setControlFeed(controlFeed);

      credentials.push(
        await this._signingContext.credentialSigner.createCredential({
          subject: controlFeed.key,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            spaceKey: this.key,
            deviceKey: this._signingContext.deviceKey,
            identityKey: this._signingContext.identityKey,
            designation: AdmittedFeed.Designation.CONTROL,
          },
        }),
      );
    }
    if (!this.inner.dataFeedKey) {
      const dataFeed = await this._feedStore.openFeed(await this._keyring.createKey(), {
        writable: true,
        sparse: true,
      });
      await this.inner.setDataFeed(dataFeed);

      credentials.push(
        await this._signingContext.credentialSigner.createCredential({
          subject: dataFeed.key,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            spaceKey: this.key,
            deviceKey: this._signingContext.deviceKey,
            identityKey: this._signingContext.identityKey,
            designation: AdmittedFeed.Designation.DATA,
          },
        }),
      );
    }

    if (credentials.length > 0) {
      // Never times out
      await this.notarizationPlugin.notarize({ ctx: this._ctx, credentials, timeout: 0 });

      // Set this after credentials are notarized so that on failure we will retry.
      await this._metadataStore.setWritableFeedKeys(this.key, this.inner.controlFeedKey!, this.inner.dataFeedKey!);
    }
  }

  private _onNewAutomergeRoot(rootUrl: string) {
    log('loading automerge root doc for space', { space: this.key, rootUrl });
    // Override share policy = true for the root document.
    // Workaround for https://github.com/automerge/automerge-repo/pull/292
    this._echoHost.replicateDocument(rootUrl);
    const handle = this._echoHost.automergeRepo.find(rootUrl as any);

    // TODO(dmaretskyi): Make this single-threaded (but doc loading should still be parallel to not block epoch processing).
    queueMicrotask(async () => {
      try {
        await warnAfterTimeout(5_000, 'Automerge root doc load timeout (DataSpace)', async () => {
          await cancelWithContext(this._ctx, handle.whenReady());
        });
        if (this._ctx.disposed) {
          return;
        }

        // Ensure only one root is processed at a time.
        using _guard = await this._epochProcessingMutex.acquire();

        // Attaching space keys to legacy documents.
        const doc = handle.docSync() ?? failedInvariant();
        if (!doc.access?.spaceKey) {
          handle.change((doc: any) => {
            doc.access = { spaceKey: this.key.toHex() };
          });
        }

        // TODO(dmaretskyi): Close roots.
        // TODO(dmaretskyi): How do we handle changing to the next EPOCH?
        const root = await this._echoHost.openSpaceRoot(handle.url);
        if (root.getVersion() !== SpaceDocVersion.CURRENT) {
          this._state = SpaceState.REQUIRES_MIGRATION;
          this.stateUpdate.emit();
        } else {
          if (this._state !== SpaceState.READY) {
            await this._enterReadyState();
          }
        }
      } catch (err) {
        if (err instanceof ContextDisposedError) {
          return;
        }
        log.warn('error loading automerge root doc', { space: this.key, rootUrl, err });
      }
    });
  }

  // TODO(dmaretskyi): Use profile from signing context.
  async updateOwnProfile(profile: ProfileDocument) {
    const credential = await this._signingContext.credentialSigner.createCredential({
      subject: this._signingContext.identityKey,
      assertion: {
        '@type': 'dxos.halo.credentials.MemberProfile',
        profile,
      },
    });
    await this.inner.controlPipeline.writer.write({ credential: { credential } });
  }

  async createEpoch(options?: CreateEpochOptions) {
    const ctx = this._ctx.derive();

    // Preserving existing behavior.
    if (!options?.migration) {
      return;
    }

    const { newRoot } = await runEpochMigration(ctx, {
      repo: this._echoHost.automergeRepo,
      spaceId: this.id,
      spaceKey: this.key,
      migration: options.migration,
      currentRoot: this._automergeSpaceState.rootUrl ?? null,
      newAutomergeRoot: options.newAutomergeRoot,
    });

    const epoch: Epoch = {
      previousId: this._automergeSpaceState.lastEpoch?.id,
      number: (this._automergeSpaceState.lastEpoch?.subject.assertion.number ?? -1) + 1,
      timeframe: this._automergeSpaceState.lastEpoch?.subject.assertion.timeframe ?? new Timeframe(),
      automergeRoot: newRoot ?? this._automergeSpaceState.rootUrl,
    };

    const receipt = await this.inner.controlPipeline.writer.write({
      credential: {
        credential: await this._signingContext.credentialSigner.createCredential({
          subject: this.key,
          assertion: {
            '@type': 'dxos.halo.credentials.Epoch',
            ...epoch,
          },
        }),
      },
    });

    await this.inner.controlPipeline.state.waitUntilTimeframe(new Timeframe([[receipt.feedKey, receipt.seq]]));
    await this._echoHost.updateIndexes();
  }

  @synchronized
  async activate() {
    if (![SpaceState.CLOSED, SpaceState.INACTIVE].includes(this._state)) {
      return;
    }

    await this._metadataStore.setSpaceState(this.key, SpaceState.ACTIVE);
    await this._open();
    this.initializeDataPipelineAsync();
  }

  @synchronized
  async deactivate() {
    if (this._state === SpaceState.INACTIVE) {
      return;
    }
    // Unregister from data service.
    await this._metadataStore.setSpaceState(this.key, SpaceState.INACTIVE);
    if (this._state !== SpaceState.CLOSED) {
      await this._close();
    }
    this._state = SpaceState.INACTIVE;
    log('new state', { state: SpaceState[this._state] });
    this.stateUpdate.emit();
  }
}
