import { ExtensionContext, RpcExtension } from "@dxos/teleport";
import { NotarizationService, NotarizeRequest } from '@dxos/protocols/proto/dxos/mesh/teleport/notarization'
import { schema } from "@dxos/protocols";
import { Credential } from "@dxos/protocols/proto/dxos/halo/credentials";
import { PublicKey } from "@dxos/keys";
import { CredentialProcessor } from "@dxos/credentials";
import { FeedWriter } from "@dxos/feed-store";
import assert from "node:assert";
import { ComplexMap, ComplexSet, entry } from "@dxos/util";
import { DeferredTask, Event, scheduleTask, TimeoutError, Trigger } from "@dxos/async";
import { Context } from "@dxos/context";
import { log } from "@dxos/log";

const RETRY_TIMEOUT = 1000;
const NOTARIZE_TIMEOUT = 10_000;

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


  async open() {

  }

  async close() {
    await this._ctx.dispose();
  }

  /**
   * Request credentials to be notarized.
   */
  async notarize(credentials: Credential[]) {
    log('notarize', { credentials })
    assert(credentials.every(credential => credential.id), 'Credentials must have an id');

    const errors = new Trigger();
    const ctx = this._ctx.derive({
      onError: err => {
        log.warn('Notarization error', { err })
        ctx.dispose()
        errors.throw(err);
      }
    });
    scheduleTask(ctx, () => {
      log.warn('Notarization timeout')
      ctx.dispose()
      errors.throw(new TimeoutError(NOTARIZE_TIMEOUT, 'Notarization timed out'));
    }, NOTARIZE_TIMEOUT);

    const allNotarized = Promise.all(credentials.map(credential => this._waitUntilProcessed(credential.id!))); 

    const peersTried = new Set<NotarizationTeleportExtension>();

    // Repeatable task that tries to notarize credentials with one of the available peers.
    const notarizeTask = new DeferredTask(ctx, async () => {
      try {
        if(this._extensions.size === 0) {
          log.warn('No peers to notarize with')
          return; // No peers to try.
        }

        // Pick a peer that we haven't tried yet.
        const peer = [...this._extensions].find(peer => !peersTried.has(peer));
        if(!peer) {
          log.warn('Exhausted all peers to notarize with', { retryIn: RETRY_TIMEOUT })
          peersTried.clear();
          scheduleTask(ctx, () => notarizeTask.schedule(), RETRY_TIMEOUT) // retry with all peers again
          return;
        }

        peersTried.add(peer);
        log('try notarizing', { peer: peer.localPeerId, credentialId: credentials.map(credential => credential.id) })
        await peer.rpc.NotarizationService.notarize({
          credentials: credentials.filter(credential => !this._processedCredentials.has(credential.id!))
        });
        log('success')
      } catch(err) {
        log.warn('error notarizing (recoverable)', err)
        notarizeTask.schedule() // retry immediately with next peer
      }
    })

    notarizeTask.schedule();
    this._extensionOpened.on(ctx, () => notarizeTask.schedule());
    
    try {
      // TODO(dmaretskyi): Abort (context) & timeout.
      await Promise.race([
        allNotarized,
        errors.wait()
      ]);
      log('done')
    } finally {
      await ctx.dispose()
    }
  }

  /**
   * Called with credentials arriving from the control pipeline.
   */
  async process(credential: Credential) {
    if(!credential.id) {
      return;
    }
    this._processCredentialsTriggers.get(credential.id)?.wake();
    this._processedCredentials.add(credential.id);
    this._processCredentialsTriggers.delete(credential.id);
  }

  async setWriter(writer: FeedWriter<Credential>) {
    assert(!this._writer, 'Writer already set.')
    this._writer = writer;
  }

  private async _waitUntilProcessed(id: PublicKey) {
    if(this._processedCredentials.has(id)) {
      return;
    }
    await entry(this._processCredentialsTriggers, id).orInsert(new Trigger()).value.wait();
  }

  /**
   * Requests from other peers to notarize credentials.
   */
  private async _onNotarize(request: NotarizeRequest) {
    if(!this._writer) {
      throw new Error('Writer not set');
    }
    for(const credential of request.credentials ?? []) {
      assert(credential.id, 'Credential must have an id');
      if(this._processedCredentials.has(credential.id)) {
        continue;
      }
      await this._writer.write(credential);
    }
  }

  createExtension() {
    const extension = new NotarizationTeleportExtension({
      onOpen: async () => {
        log('extension opened', { peer: extension.localPeerId })
        this._extensions.add(extension);
        this._extensionOpened.emit();
      },
      onClose: async () => {
        log('extension closed', { peer: extension.localPeerId })
        this._extensions.delete(extension);
      },
      onNotarize: this._onNotarize.bind(this)
    });
    return extension;
  }
}

export type NotarizationTeleportExtensionParams = {
  onOpen: () => Promise<void>,
  onClose: () => Promise<void>,
  onNotarize: (request: NotarizeRequest) => Promise<void>,
}

export class NotarizationTeleportExtension extends RpcExtension<Services, Services>  {
  constructor(
    private readonly _params: NotarizationTeleportExtensionParams,
  ) {
    super({
      requested: {
        NotarizationService: schema.getService('dxos.mesh.teleport.notarization.NotarizationService')
      },
      exposed: {
        NotarizationService: schema.getService('dxos.mesh.teleport.notarization.NotarizationService')
      }
    })
  }

  protected async getHandlers(): Promise<Services> {
    return {
      NotarizationService: {
        notarize: async (request) => {
          await this._params.onNotarize(request);
        }
      }
    }
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
}