//
// Copyright 2023 DXOS.org
//

import { DeferredTask, Event, TimeoutError, Trigger, scheduleMicroTask, scheduleTask, sleep } from '@dxos/async';
import { type Context, Resource, rejectOnDispose } from '@dxos/context';
import { type CredentialProcessor, verifyCredential } from '@dxos/credentials';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { type FeedWriter } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type SpaceId } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import { EdgeCallFailedError } from '@dxos/protocols';
import { schema } from '@dxos/protocols/proto';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type NotarizationService, type NotarizeRequest } from '@dxos/protocols/proto/dxos/mesh/teleport/notarization';
import { type ExtensionContext, RpcExtension } from '@dxos/teleport';
import { ComplexMap, ComplexSet, entry } from '@dxos/util';

const DEFAULT_RETRY_TIMEOUT = 1_000;

const DEFAULT_SUCCESS_DELAY = 1_000;

const DEFAULT_NOTARIZE_TIMEOUT = 10_000;

const DEFAULT_ACTIVE_EDGE_POLLING_INTERVAL = 3_000;

const MAX_EDGE_RETRIES = 2;

const WRITER_NOT_SET_ERROR_CODE = 'WRITER_NOT_SET';

const credentialCodec = schema.getCodecForType('dxos.halo.credentials.Credential');

export type NotarizationPluginParams = {
  spaceId: SpaceId;
  edgeClient?: EdgeHttpClient;
  edgeFeatures?: Runtime.Client.EdgeFeatures;
  activeEdgePollingInterval?: number;
};

export type NotarizeParams = {
  /**
   * For cancellation.
   */
  ctx?: Context;

  /**
   * Credentials to notarize.
   */
  credentials: Credential[];

  /**
   * Timeout for the whole notarization process.
   * Set to 0 to disable.
   * @default {@link DEFAULT_NOTARIZE_TIMEOUT}
   */
  timeout?: number;

  /**
   * Retry timeout.
   * @default {@link DEFAULT_RETRY_TIMEOUT}
   */
  retryTimeout?: number;

  /**
   * Minimum wait time after a peer confirms successful notarization before attempting with a new peer.
   * This is to avoid spamming peers with notarization requests.
   * @default {@link DEFAULT_SUCCESS_DELAY}
   */
  successDelay?: number;

  /**
   * A random amount of time before making or retrying an edge request to help prevent large bursts of requests.
   */
  edgeRetryJitter?: number;
};

/**
 * See NotarizationService proto.
 */
export class NotarizationPlugin extends Resource implements CredentialProcessor {
  private readonly _extensionOpened = new Event();

  private _writer: FeedWriter<Credential> | undefined;
  private readonly _extensions = new Set<NotarizationTeleportExtension>();
  private readonly _processedCredentials = new ComplexSet<PublicKey>(PublicKey.hash);
  private readonly _processCredentialsTriggers = new ComplexMap<PublicKey, Trigger>(PublicKey.hash);

  private _activeEdgePollingIntervalHandle: any | undefined = undefined;
  private readonly _activeEdgePollingInterval: number;
  private _activeEdgePollingEnabled = false;

  @logInfo
  private readonly _spaceId: SpaceId;

  private readonly _edgeClient: EdgeHttpClient | undefined;

  constructor(params: NotarizationPluginParams) {
    super();
    this._spaceId = params.spaceId;
    this._activeEdgePollingInterval = params.activeEdgePollingInterval ?? DEFAULT_ACTIVE_EDGE_POLLING_INTERVAL;
    if (params.edgeClient && params.edgeFeatures?.feedReplicator) {
      this._edgeClient = params.edgeClient;
    }
  }

  setActiveEdgePollingEnabled(enabled: boolean): void {
    const client = this._edgeClient;
    invariant(client);
    this._activeEdgePollingEnabled = enabled;
    if (this.isOpen) {
      if (enabled && !this._activeEdgePollingIntervalHandle) {
        this._startPeriodicEdgePolling(client);
      } else if (!enabled && this._activeEdgePollingIntervalHandle) {
        this._stopPeriodicEdgePolling();
      }
    }
  }

  get hasWriter() {
    return !!this._writer;
  }

  protected override async _open(): Promise<void> {
    if (this._edgeClient) {
      if (this._activeEdgePollingEnabled) {
        this._startPeriodicEdgePolling(this._edgeClient);
      }
      if (this._writer) {
        this._notarizePendingEdgeCredentials(this._edgeClient, this._writer);
      }
    }
  }

  protected override async _close(): Promise<void> {
    this._stopPeriodicEdgePolling();
    await this._ctx.dispose();
  }

  /**
   * Request credentials to be notarized.
   */
  async notarize({
    ctx: opCtx,
    credentials,
    timeout = DEFAULT_NOTARIZE_TIMEOUT,
    retryTimeout = DEFAULT_RETRY_TIMEOUT,
    successDelay = DEFAULT_SUCCESS_DELAY,
    edgeRetryJitter,
  }: NotarizeParams): Promise<void> {
    log('notarize', { credentials });
    invariant(
      credentials.every((credential) => credential.id),
      'Credentials must have an id',
    );

    const errors = new Trigger();
    const ctx = this._ctx.derive({
      onError: (err) => {
        log.warn('Notarization error', { err });
        void ctx.dispose();
        errors.throw(err);
      },
    });
    opCtx?.onDispose(() => ctx.dispose());

    if (timeout !== 0) {
      this._scheduleTimeout(ctx, errors, timeout);
    }

    const allNotarized = Promise.all(credentials.map((credential) => this._waitUntilProcessed(credential.id!)));

    this._tryNotarizeCredentialsWithPeers(ctx, credentials, { retryTimeout, successDelay });

    if (this._edgeClient) {
      this._tryNotarizeCredentialsWithEdge(ctx, this._edgeClient, credentials, {
        retryTimeout,
        successDelay,
        jitter: edgeRetryJitter,
      });
    }

    try {
      await Promise.race([rejectOnDispose(ctx), allNotarized, errors.wait()]);
      log('done');
    } finally {
      await ctx.dispose();
    }
  }

  private _tryNotarizeCredentialsWithPeers(
    ctx: Context,
    credentials: Credential[],
    { retryTimeout, successDelay }: NotarizationTimeouts,
  ): void {
    const peersTried = new Set<NotarizationTeleportExtension>();

    // Repeatable task that tries to notarize credentials with one of the available peers.
    const notarizeTask = new DeferredTask(ctx, async () => {
      try {
        if (this._extensions.size === 0) {
          return; // No peers to try.
        }

        // Pick a peer that we haven't tried yet.
        const peer = [...this._extensions].find((peer) => !peersTried.has(peer));
        if (!peer) {
          log.info('Exhausted all peers to notarize with', { retryIn: retryTimeout });
          peersTried.clear();
          scheduleTask(ctx, () => notarizeTask.schedule(), retryTimeout); // retry with all peers again
          return;
        }

        peersTried.add(peer);
        log('try notarizing', { peer: peer.localPeerId, credentialId: credentials.map((credential) => credential.id) });
        await peer.rpc.NotarizationService.notarize({
          credentials: credentials.filter((credential) => !this._processedCredentials.has(credential.id!)),
        });
        log('success');

        await sleep(successDelay); // wait before trying with a new peer
      } catch (err: any) {
        if (!ctx.disposed && !err.message.includes(WRITER_NOT_SET_ERROR_CODE)) {
          log.info('error notarizing (recoverable)', err);
        }
        notarizeTask.schedule(); // retry immediately with next peer
      }
    });

    notarizeTask.schedule();
    this._extensionOpened.on(ctx, () => notarizeTask.schedule());
  }

  private _tryNotarizeCredentialsWithEdge(
    ctx: Context,
    client: EdgeHttpClient,
    credentials: Credential[],
    timeouts: NotarizationTimeouts & { jitter?: number },
  ): void {
    const encodedCredentials = credentials.map((credential) => {
      const binary = credentialCodec.encode(credential);
      return Buffer.from(binary).toString('base64');
    });
    scheduleTask(ctx, async () => {
      try {
        await client.notarizeCredentials(
          this._spaceId,
          { credentials: encodedCredentials },
          { retry: { count: MAX_EDGE_RETRIES, timeout: timeouts.retryTimeout, jitter: timeouts.jitter } },
        );

        log('edge notarization success');
      } catch (error: any) {
        handleEdgeError(error);
      }
    });
  }

  /**
   * Called with credentials arriving from the control pipeline.
   */
  async processCredential(credential: Credential): Promise<void> {
    if (!credential.id) {
      return;
    }
    this._processCredentialsTriggers.get(credential.id)?.wake();
    this._processedCredentials.add(credential.id);
    this._processCredentialsTriggers.delete(credential.id);
  }

  setWriter(writer: FeedWriter<Credential>): void {
    invariant(!this._writer, 'Writer already set.');
    this._writer = writer;
    if (this._edgeClient && this.isOpen) {
      this._notarizePendingEdgeCredentials(this._edgeClient, writer);
    }
  }

  private _startPeriodicEdgePolling(client: EdgeHttpClient): void {
    this._activeEdgePollingIntervalHandle = setInterval(() => {
      if (this._writer) {
        this._notarizePendingEdgeCredentials(client, this._writer);
      }
    }, this._activeEdgePollingInterval);
  }

  private _stopPeriodicEdgePolling(): void {
    if (this._activeEdgePollingIntervalHandle) {
      clearInterval(this._activeEdgePollingIntervalHandle);
      this._activeEdgePollingIntervalHandle = undefined;
    }
  }

  /**
   * The method is used only for adding agent feeds to spaces.
   * When an agent is created we can admit them into all the existing spaces. In case the operation fails
   * this method will fix it on the next space open.
   * Given how rarely this happens there's no need to poll the endpoint.
   */
  private _notarizePendingEdgeCredentials(client: EdgeHttpClient, writer: FeedWriter<Credential>): void {
    scheduleMicroTask(this._ctx, async () => {
      try {
        const response = await client.getCredentialsForNotarization(this._spaceId, {
          retry: { count: MAX_EDGE_RETRIES },
        });

        const credentials = response.awaitingNotarization.credentials;
        if (!credentials.length) {
          log('edge did not return credentials for notarization');
          return;
        }

        log('got edge credentials for notarization', { count: credentials.length });

        const decodedCredentials = credentials.map((credential) => {
          const binary = Buffer.from(credential, 'base64');
          return credentialCodec.decode(binary);
        });

        await this._notarizeCredentials(writer, decodedCredentials);

        log.info('notarized edge credentials', { count: decodedCredentials.length });
      } catch (error: any) {
        handleEdgeError(error);
      }
    });
  }

  private async _waitUntilProcessed(id: PublicKey): Promise<void> {
    if (this._processedCredentials.has(id)) {
      return;
    }
    await entry(this._processCredentialsTriggers, id).orInsert(new Trigger()).value.wait();
  }

  /**
   * Requests from other peers to notarize credentials.
   */
  private async _onNotarize(request: NotarizeRequest): Promise<void> {
    if (!this._writer) {
      throw new Error(WRITER_NOT_SET_ERROR_CODE);
    }
    await this._notarizeCredentials(this._writer, request.credentials ?? []);
  }

  private async _notarizeCredentials(writer: FeedWriter<Credential>, credentials: Credential[]): Promise<void> {
    for (const credential of credentials) {
      invariant(credential.id, 'Credential must have an id');
      if (this._processedCredentials.has(credential.id)) {
        continue;
      }
      const verificationResult = await verifyCredential(credential);
      if (verificationResult.kind === 'fail') {
        throw new Error(`Credential verification failed: ${verificationResult.errors.join('\n')}.`);
      }
      await writer.write(credential);
    }
  }

  createExtension(): NotarizationTeleportExtension {
    const extension = new NotarizationTeleportExtension({
      onOpen: async () => {
        log('extension opened', { peer: extension.localPeerId });
        this._extensions.add(extension);
        this._extensionOpened.emit();
      },
      onClose: async () => {
        log('extension closed', { peer: extension.localPeerId });
        this._extensions.delete(extension);
      },
      onNotarize: this._onNotarize.bind(this),
    });
    return extension;
  }

  private _scheduleTimeout(ctx: Context, errors: Trigger, timeout: number): void {
    scheduleTask(
      ctx,
      () => {
        log.warn('Notarization timeout', {
          timeout,
          peers: Array.from(this._extensions).map((extension) => extension.remotePeerId),
        });
        void ctx.dispose();
        errors.throw(new TimeoutError({ message: 'Notarization timed out', context: { timeout } }));
      },
      timeout,
    );
  }
}

const handleEdgeError = (error: any) => {
  if (!(error instanceof EdgeCallFailedError) || error.errorData) {
    log.catch(error);
  } else {
    log.info('Edge notarization failure', { reason: error.reason });
  }
};

export type NotarizationTeleportExtensionParams = {
  onOpen: () => Promise<void>;
  onClose: () => Promise<void>;
  onNotarize: (request: NotarizeRequest) => Promise<void>;
};

export class NotarizationTeleportExtension extends RpcExtension<Services, Services> {
  constructor(private readonly _params: NotarizationTeleportExtensionParams) {
    super({
      requested: {
        NotarizationService: schema.getService('dxos.mesh.teleport.notarization.NotarizationService'),
      },
      exposed: {
        NotarizationService: schema.getService('dxos.mesh.teleport.notarization.NotarizationService'),
      },
    });
  }

  protected async getHandlers(): Promise<Services> {
    return {
      NotarizationService: {
        notarize: async (request) => {
          await this._params.onNotarize(request);
        },
      },
    };
  }

  override async onOpen(ctx: ExtensionContext): Promise<void> {
    await super.onOpen(ctx);
    await this._params.onOpen();
  }

  override async onClose(err?: Error | undefined): Promise<void> {
    await this._params.onClose();
    await super.onClose(err);
  }
}

type NotarizationTimeouts = {
  retryTimeout: number;
  successDelay: number;
};

type Services = {
  NotarizationService: NotarizationService;
};
