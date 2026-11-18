//
// Copyright 2026 DXOS.org
//

import { AUTHORITY_PEER_ID, type SyncTransport } from '@dxos/echo-sqlite/sync';
import { log } from '@dxos/log';
import { type FeedProtocol } from '@dxos/protocols';

import { type NativeDatabase } from './database.ts';

/** Blocks per pull or push request, as echo-sqlite's `SpaceSync` uses. */
const BATCH = 100;

/** How long a request waits for its response. */
const RPC_TIMEOUT_MS = 30_000;

/** The namespaces a space syncs: objects' Automerge documents, then feed items of both kinds. */
const NAMESPACES = ['automerge', 'data', 'trace'] as const;

type QueryResponse = Extract<FeedProtocol.ProtocolMessage, { _tag: 'QueryResponse' }>;
type AppendResponse = Extract<FeedProtocol.ProtocolMessage, { _tag: 'AppendResponse' }>;

/**
 * Keeps one native database in step with its space's authority over echo-sqlite's protocol: pulls what
 * the authority holds past the local cursor, pushes blocks it has not positioned, and applies pulled
 * blocks. The protocol and transport stay in JS (they are I/O and message routing); each pulled batch
 * crosses into the engine as one call that stores, indexes and records the cursor in one transaction.
 *
 * Unlike `@dxos/feed`'s `SyncClient` it does not replay a namespace after an authority rollback; a
 * changed server token resets the namespace's positions and pulls it again.
 */
export class NativeSync {
  readonly #db: NativeDatabase;
  readonly #transport: SyncTransport;
  readonly #peerId: string;
  readonly #pending = new Map<
    string,
    { resolve: (message: FeedProtocol.ProtocolMessage) => void; reject: (error: Error) => void }
  >();
  readonly #cleanup: (() => void)[] = [];
  #running: Promise<void> | undefined;
  #requested = false;
  #closed = false;
  #lastError: unknown = undefined;
  /** Blocks pulled and pushed, for the benchmark report. */
  readonly stats = { pulled: 0, pushed: 0, rounds: 0, engineMs: 0, waitMs: 0, applyMs: 0 };

  constructor(db: NativeDatabase, transport: SyncTransport, options: { peerId?: string } = {}) {
    this.#db = db;
    this.#transport = transport;
    this.#peerId = options.peerId ?? crypto.randomUUID();
    this.#cleanup.push(
      transport.onMessage((message) => this.#onMessage(message)),
      db.onCommit(() => this.#request()),
      transport.onConnectionChange?.((connected) => connected && this.#request()) ?? (() => {}),
    );
    this.#request();
  }

  get lastError(): unknown {
    return this.#lastError;
  }

  /** Resolves once no round is running or requested. */
  async synced(): Promise<void> {
    while (this.#running) {
      await this.#running;
    }
    if (this.#lastError !== undefined) {
      throw this.#lastError;
    }
  }

  async close(): Promise<void> {
    this.#closed = true;
    this.#cleanup.forEach((cleanup) => cleanup());
    await this.#running;
    for (const { reject } of this.#pending.values()) {
      reject(new Error('sync closed'));
    }
    this.#pending.clear();
  }

  #onMessage(message: FeedProtocol.ProtocolMessage): void {
    if (message._tag === 'FeedAdvanced') {
      this.#request();
      return;
    }
    const requestId = 'requestId' in message ? message.requestId : undefined;
    const pending = requestId === undefined ? undefined : this.#pending.get(requestId);
    if (!pending || requestId === undefined) {
      return;
    }
    this.#pending.delete(requestId);
    if (message._tag === 'Error') {
      pending.reject(new Error(message.message));
    } else {
      pending.resolve(message);
    }
  }

  #rpc(message: FeedProtocol.ProtocolMessage & { requestId: string }): Promise<FeedProtocol.ProtocolMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(message.requestId);
        reject(new Error(`sync request ${message._tag} timed out`));
      }, RPC_TIMEOUT_MS);
      timer.unref?.();
      this.#pending.set(message.requestId, {
        resolve: (reply) => {
          clearTimeout(timer);
          resolve(reply);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      this.#transport.send(message);
    });
  }

  #request(): void {
    if (this.#closed) {
      return;
    }
    this.#requested = true;
    this.#running ??= this.#loop().finally(() => {
      this.#running = undefined;
    });
  }

  async #loop(): Promise<void> {
    while (this.#requested && !this.#closed) {
      this.#requested = false;
      try {
        await this.#round();
        this.#lastError = undefined;
      } catch (err) {
        log.warn('native sync round failed', { error: err });
        this.#lastError = err;
        return;
      }
    }
  }

  async #round(): Promise<void> {
    this.stats.rounds++;
    for (const namespace of NAMESPACES) {
      while (!(await this.#pull(namespace))) {}
    }
    for (const namespace of NAMESPACES) {
      while (!(await this.#push(namespace))) {}
    }
  }

  /** Pulls one batch; true once the authority has nothing past the cursor. */
  async #pull(namespace: string): Promise<boolean> {
    const { native, handle } = this.#db.store;
    const { lastPulledPosition, serverToken } = native.syncState(handle, namespace);
    const waitStart = performance.now();
    const reply = await this.#rpc({
      _tag: 'QueryRequest',
      requestId: crypto.randomUUID(),
      senderPeerId: this.#peerId,
      recipientPeerId: AUTHORITY_PEER_ID,
      spaceId: this.#db.spaceId,
      feedNamespace: namespace,
      position: lastPulledPosition,
      limit: BATCH,
      expectedServerToken: serverToken,
    });
    this.stats.waitMs += performance.now() - waitStart;
    if (reply._tag !== 'QueryResponse') {
      throw new Error(`unexpected reply ${reply._tag}`);
    }
    const response: QueryResponse = reply;
    let base = lastPulledPosition;
    if (response.serverToken !== undefined && serverToken !== undefined && response.serverToken !== serverToken) {
      // Another store's positions: forget them and pull the namespace again from the start.
      native.resetSync(handle, namespace, response.serverToken);
      base = -1;
    }
    if (response.blocks.length === 0) {
      if (response.serverToken !== serverToken) {
        native.applyPulled(handle, namespace, response.serverToken, base, []);
      }
      return true;
    }
    const cursor = response.blocks.reduce((max, block) => Math.max(max, block.position ?? max), base);
    const engineStart = performance.now();
    const indexed = native.applyPulled(handle, namespace, response.serverToken ?? serverToken, cursor, response.blocks);
    this.stats.engineMs += performance.now() - engineStart;
    this.stats.pulled += response.blocks.length;
    this.#db.store.notePulled(indexed);
    const applyStart = performance.now();
    await this.#db.applyRemote();
    this.stats.applyMs += performance.now() - applyStart;
    return false;
  }

  /** Pushes one batch of unpositioned blocks; true when none remain. */
  async #push(namespace: string): Promise<boolean> {
    const { native, handle } = this.#db.store;
    const blocks = native.unpositioned(handle, namespace, BATCH);
    if (blocks.length === 0) {
      return true;
    }
    const reply = await this.#rpc({
      _tag: 'AppendRequest',
      requestId: crypto.randomUUID(),
      senderPeerId: this.#peerId,
      recipientPeerId: AUTHORITY_PEER_ID,
      spaceId: this.#db.spaceId,
      feedNamespace: namespace,
      blocks: blocks.map((block) => ({
        feedId: block.feedId,
        actorId: block.actorId,
        sequence: block.sequence,
        prevActorId: block.prevActorId,
        prevSequence: block.prevSequence,
        position: null,
        timestamp: block.timestamp,
        data: block.data,
      })),
    });
    if (reply._tag !== 'AppendResponse') {
      throw new Error(`unexpected reply ${reply._tag}`);
    }
    const response: AppendResponse = reply;
    if (response.positions.length !== blocks.length) {
      throw new Error(`authority positioned ${response.positions.length} of ${blocks.length} blocks`);
    }
    native.setPositions(
      handle,
      blocks.map((block, index) => ({ insertionId: block.insertionId, position: response.positions[index] })),
    );
    this.stats.pushed += blocks.length;
    return false;
  }
}
