//
// Copyright 2023 DXOS.org
//

import { DeferredTask, Event, scheduleTask, sleep, TimeoutError, Trigger } from '@dxos/async';
import { Context, rejectOnDispose } from '@dxos/context';
import { type CredentialProcessor } from '@dxos/credentials';
import { type FeedWriter } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type NotarizationService, type NotarizeRequest } from '@dxos/protocols/proto/dxos/mesh/teleport/notarization';
import { type ExtensionContext, RpcExtension } from '@dxos/teleport';
import { ComplexMap, ComplexSet, entry } from '@dxos/util';

const DEFAULT_RETRY_TIMEOUT = 1_000;

const DEFAULT_SUCCESS_DELAY = 1_000;

const DEFAULT_NOTARIZE_TIMEOUT = 10_000;

const WRITER_NOT_SET_ERROR_CODE = 'WRITER_NOT_SET';

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
};

/**
 * See NotarizationService proto.
 */
export class NotarizationPlugin implements CredentialProcessor {
  private readonly _ctx = new Context();
  private readonly _extensionOpened = new Event();

  private _writer: FeedWriter<Credential> | undefined;
  private readonly _extensions = new Set<NotarizationTeleportExtension>();
  private readonly _processedCredentials = new ComplexSet<PublicKey>(PublicKey.hash);
  private readonly _processCredentialsTriggers = new ComplexMap<PublicKey, Trigger>(PublicKey.hash);

  get hasWriter() {
    return !!this._writer;
  }

  async open() {}

  async close() {
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
  }: NotarizeParams) {
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

    // Timeout/
    if (timeout !== 0) {
      scheduleTask(
        ctx,
        () => {
          log.warn('Notarization timeout', {
            timeout,
            peers: Array.from(this._extensions).map((extension) => extension.remotePeerId),
          });
          void ctx.dispose();
          errors.throw(new TimeoutError(timeout, 'Notarization timed out'));
        },
        timeout,
      );
    }

    const allNotarized = Promise.all(credentials.map((credential) => this._waitUntilProcessed(credential.id!)));

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
          log.warn('Exhausted all peers to notarize with', { retryIn: retryTimeout });
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
          log.warn('error notarizing (recoverable)', err);
        }
        notarizeTask.schedule(); // retry immediately with next peer
      }
    });

    notarizeTask.schedule();
    this._extensionOpened.on(ctx, () => notarizeTask.schedule());

    try {
      await Promise.race([rejectOnDispose(ctx), allNotarized, errors.wait()]);
      log('done');
    } finally {
      await ctx.dispose();
    }
  }

  /**
   * Called with credentials arriving from the control pipeline.
   */
  async processCredential(credential: Credential) {
    if (!credential.id) {
      return;
    }
    this._processCredentialsTriggers.get(credential.id)?.wake();
    this._processedCredentials.add(credential.id);
    this._processCredentialsTriggers.delete(credential.id);
  }

  setWriter(writer: FeedWriter<Credential>) {
    invariant(!this._writer, 'Writer already set.');
    this._writer = writer;
  }

  private async _waitUntilProcessed(id: PublicKey) {
    if (this._processedCredentials.has(id)) {
      return;
    }
    await entry(this._processCredentialsTriggers, id).orInsert(new Trigger()).value.wait();
  }

  /**
   * Requests from other peers to notarize credentials.
   */
  private async _onNotarize(request: NotarizeRequest) {
    if (!this._writer) {
      throw new Error(WRITER_NOT_SET_ERROR_CODE);
    }
    for (const credential of request.credentials ?? []) {
      invariant(credential.id, 'Credential must have an id');
      if (this._processedCredentials.has(credential.id)) {
        continue;
      }
      await this._writer.write(credential);
    }
  }

  createExtension() {
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
}

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

  override async onOpen(ctx: ExtensionContext) {
    await super.onOpen(ctx);
    await this._params.onOpen();
  }

  override async onClose(err?: Error | undefined) {
    await this._params.onClose();
    await super.onClose(err);
  }
}

type Services = {
  NotarizationService: NotarizationService;
};
