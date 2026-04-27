//
// Copyright 2026 DXOS.org
//

/**
 * Integration test simulating the edge architecture:
 *
 * Client peer:
 *   {@link Repo} + Subduction via a {@link DumbNetworkAdapter} (explicit send/receive callbacks).
 *
 * Server peer (simulated edge Durable Object):
 *   {@link MemoryStorage} as KV store, incoming {@link Message} queue drained on each
 *   {@link ServerPeer.alarm} call, with a switch-case dispatcher that mirrors
 *   AutomergeReplicator._processOneMessage().
 *
 * Transport:
 *   - Client → Server: {@link DumbNetworkAdapter.send} → {@link ServerPeer.enqueueMessage}
 *   - Server → Client: {@link ServerSubductionTransport.sendBytes} → {@link DumbNetworkAdapter.deliverInbound}
 *
 * The test drives the alarm loop manually to simulate Cloudflare DO alarm scheduling.
 */

import { NetworkAdapter, Repo, type Message, type PeerId, type PeerMetadata } from '@automerge/automerge-repo';
import { DummyStorageAdapter } from '@automerge/automerge-repo/helpers/DummyStorageAdapter.js';
import { MemorySigner, MemoryStorage, Subduction, type Transport } from '@automerge/automerge-subduction';
import { describe, test } from 'vitest';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Message type used for all Subduction frames on the adapter layer. */
const SUBDUCTION_MESSAGE_TYPE = 'subduction-connection' as const;

const SERVICE_NAME = 'test-edge-service';

// ─── Utilities ────────────────────────────────────────────────────────────────

class AsyncQueue<T> {
  private _items: T[] = [];
  private _waiters: Array<{ resolve: (item: T) => void; reject: (err: Error) => void }> = [];
  private _closed = false;

  push(item: T): void {
    if (this._closed) {
      return;
    }
    const waiter = this._waiters.shift();
    if (waiter) {
      waiter.resolve(item);
    } else {
      this._items.push(item);
    }
  }

  async pull(): Promise<T> {
    if (this._closed) {
      throw new Error('queue closed');
    }
    const item = this._items.shift();
    if (item !== undefined) {
      return item;
    }
    return new Promise<T>((resolve, reject) => {
      if (this._closed) {
        reject(new Error('queue closed'));
        return;
      }
      this._waiters.push({ resolve, reject });
    });
  }

  /** Reject all pending pulls and prevent future use. Mirrors transport teardown on hibernation. */
  close(): void {
    if (this._closed) {
      return;
    }
    this._closed = true;
    for (const waiter of this._waiters) {
      waiter.reject(new Error('queue closed'));
    }
    this._waiters = [];
  }
}

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ─── Client-side transport ────────────────────────────────────────────────────

/**
 * Minimal {@link NetworkAdapter} for the client peer.
 *
 * - {@link send}: routes the message to the server's incoming queue (the "dumb send callback").
 * - {@link deliverInbound}: pushes a message from the server back into this Repo's receive path
 *   (the "receive callback").
 *
 * Mirrors the WebSocket leg on the edge client: the client sends frames to the Router,
 * and the Router delivers frames back via the same WebSocket.
 */
class DumbNetworkAdapter extends NetworkAdapter {
  constructor(
    private readonly _remotePeerId: PeerId,
    private readonly _onSend: (message: Message) => void,
  ) {
    super();
  }

  override isReady(): boolean {
    return true;
  }

  override whenReady(): Promise<void> {
    return Promise.resolve();
  }

  override connect(peerId: PeerId, _metadata?: PeerMetadata): void {
    this.peerId = peerId;
    queueMicrotask(() => {
      this.emit('peer-candidate', { peerId: this._remotePeerId, peerMetadata: {} });
    });
  }

  override send(message: Message): void {
    this._onSend(message);
  }

  /** Deliver a message from the remote peer into this adapter's listeners (e.g. the Repo). */
  deliverInbound(message: Message): void {
    this.emit('message', message);
  }

  override disconnect(): void {
    this.emit('close');
  }
}

// ─── Server-side raw transport ────────────────────────────────────────────────

/**
 * Raw {@link Transport} that wires the server-side {@link Subduction} instance
 * to the client's {@link DumbNetworkAdapter}.
 *
 * - {@link sendBytes}: wraps raw Subduction bytes in a {@link Message} and delivers
 *   directly to the client adapter (the server → client send path).
 * - {@link recvBytes}: blocks on an {@link AsyncQueue}; the alarm feeds bytes into it.
 * - {@link receiveBytes}: called by the server alarm to inject inbound bytes from the client.
 *
 * This replaces the WebSocket leg on the server side without needing a Repo.
 */
class ServerSubductionTransport implements Transport {
  private readonly _recvQueue = new AsyncQueue<Uint8Array>();
  private _disconnectCallback: (() => void) | undefined;

  constructor(
    private readonly _serverPeerId: PeerId,
    private readonly _clientPeerId: PeerId,
    private readonly _clientAdapter: DumbNetworkAdapter,
  ) {}

  async sendBytes(bytes: Uint8Array): Promise<void> {
    const message: Message = {
      type: SUBDUCTION_MESSAGE_TYPE,
      senderId: this._serverPeerId,
      targetId: this._clientPeerId,
      data: new Uint8Array(bytes),
    };
    queueMicrotask(() => this._clientAdapter.deliverInbound(message));
  }

  recvBytes(): Promise<Uint8Array> {
    return this._recvQueue.pull();
  }

  async disconnect(): Promise<void> {
    this.abandonSilently();
  }

  onDisconnect(callback: () => void): void {
    this._disconnectCallback = callback;
  }

  /**
   * Called by the server alarm to feed an inbound Subduction byte frame from the client.
   * This is the bridge between the alarm's queue drain and the Subduction recv loop.
   */
  receiveBytes(bytes: Uint8Array): void {
    this._recvQueue.push(bytes);
  }

  /**
   * Abandon the transport without sending any signal to the client.
   *
   * Used by {@link ServerPeer.hibernate} to simulate a hard process kill.
   * In real CF DO hibernation the V8 isolate is frozen mid-execution — no graceful
   * teardown, no callbacks, no messages sent over the WebSocket.
   *
   * We close the recv queue so the Subduction background task unblocks and
   * cleans up the WASM heap, but we deliberately do NOT emit `peer-disconnected`
   * or call the disconnect callback (which could trigger Subduction to send a
   * termination frame to the client).
   */
  abandonSilently(): void {
    this._disconnectCallback = undefined; // Prevent any Subduction teardown callbacks.
    this._recvQueue.close();
  }
}

// ─── Server peer (simulated edge Durable Object) ──────────────────────────────

/**
 * Simulates an edge AutomergeReplicator Durable Object.
 *
 * State:
 * - {@link _kv}: Subduction sedimentree storage (mirrors Cloudflare KV / DO storage).
 * - {@link _queue}: incoming message queue (mirrors {@link DurableObjectQueue}).
 *
 * Lifecycle:
 * - {@link acceptConnection}: initializes the DO and establishes a Subduction session
 *   (mirrors `_init()` + `acceptTransport`).
 * - {@link enqueueMessage}: appends an inbound message to the queue
 *   (mirrors Router → `receiveMessage()`).
 * - {@link alarm}: drains the queue and dispatches each message by type
 *   (mirrors `alarm()` → `_processQueuedMessages()` → `_processOneMessage()`).
 *
 * NOTE: There are two distinct peer ID spaces:
 * - automerge-repo `PeerId`: string IDs used in {@link Message} routing (`senderId`/`targetId`).
 * - Subduction `PeerId`: cryptographic IDs derived from signing keys, used inside
 *   the Subduction protocol but invisible at the adapter message layer.
 *
 * The {@link _automergePeerId} is the automerge-repo ID. It must match what the client
 * adapter was given as `remotePeerId` so the {@link NetworkAdapterTransport} filter
 * (`senderId === remotePeerId`) accepts incoming messages.
 */
/**
 * Simulates an edge AutomergeReplicator Durable Object.
 *
 * Hibernation model
 * -----------------
 * In CF DO the V8 isolate is frozen mid-execution with no warning.
 * Two categories of state exist:
 *
 *   LOST on hibernation:   _transport  (Subduction WASM heap + recv queue)
 *   SURVIVES hibernation:  kv          (DO Storage / Cloudflare KV)
 *                          _clientAdapter / _clientPeerId
 *                          (WebSocket handle, retrieved via ctx.getWebSockets())
 *
 * Because the client doesn't know the server hibernated, it keeps sending periodic
 * sync bytes.  On the first alarm after wake-up the server detects "messages in queue
 * but no transport", discards the stale bytes from the dead session, signals the client
 * to reconnect (over the still-open WebSocket), and pre-creates a fresh transport ready
 * to accept the incoming handshake.
 *
 * Lifecycle
 * ---------
 * - {@link acceptConnection}: called once per WebSocket session (initial connect or
 *   after the client reconnects following a server-initiated reconnect request).
 * - {@link enqueueMessage}: appends an inbound message (mirrors queue.enqueue()).
 * - {@link alarm}: drains the queue; on post-hibernation wake-up triggers reconnect.
 * - {@link hibernate}: hard-kills in-memory state, no callbacks fired.
 */
class ServerPeer {
  /** KV store — the ONLY state that survives hibernation. */
  readonly kv = new MemoryStorage();
  /** Incoming message queue drained on each alarm. */
  private readonly _queue: Message[] = [];
  /**
   * Client WebSocket handle equivalent.
   * In CF DO this is `ctx.getWebSockets()[tag]` — always available after wake-up.
   * Set once per client session, survives hibernation.
   */
  private _clientAdapter: DumbNetworkAdapter | undefined;
  private _clientPeerId: PeerId | undefined;
  /**
   * Subduction transport (recv queue + send channel).
   * Lost on hibernation.  Recreated by {@link _initiateReconnect}.
   */
  private _transport: ServerSubductionTransport | undefined;
  /** True while a reconnect handshake is in flight. */
  private _reconnecting = false;
  /** Observed message types for test assertion. */
  readonly observedTypes: string[] = [];

  constructor(
    private readonly _signer: MemorySigner,
    private readonly _serviceName: string,
    /** The automerge-repo PeerId that the client adapter was told to expect for this server. */
    private readonly _automergePeerId: PeerId,
  ) {}

  get peerId(): PeerId {
    return this._automergePeerId;
  }

  /**
   * Set up the transport and complete the Subduction handshake for a new client session.
   *
   * Mirrors: AutomergeReplicator._init(spaceId) + subduction.acceptTransport(...)
   *
   * The Subduction WASM instance is a local variable — intentionally discarded after
   * the handshake.  Only `kv` carries state forward.
   */
  async acceptConnection(clientPeerId: PeerId, clientAdapter: DumbNetworkAdapter): Promise<void> {
    this._clientAdapter = clientAdapter;
    this._clientPeerId = clientPeerId;
    this._reconnecting = false;
    const subduction = await Subduction.hydrate(this._signer, this.kv, this._serviceName);
    this._transport = new ServerSubductionTransport(this._automergePeerId, clientPeerId, clientAdapter);
    await subduction.acceptTransport(this._transport, this._serviceName);
    // Subduction instance discarded here; sedimentree state is persisted in kv.
  }

  /**
   * Enqueue an inbound message from the client.
   *
   * Mirrors: Router.webSocketMessage() → AutomergeReplicator.receiveMessage() → queue.enqueue()
   */
  enqueueMessage(message: Message): void {
    this._queue.push(message);
    this.observedTypes.push(message.type);
  }

  /**
   * Process all queued messages.
   *
   * Mirrors: AutomergeReplicator.alarm() → _processQueuedMessages()
   *
   * Post-hibernation recovery:
   *   If the server woke up with no transport but has queued messages, the bytes are
   *   from a dead session.  We discard them, signal the client to reconnect (using the
   *   preserved WebSocket handle), and set up a fresh transport for the incoming handshake.
   *   Future alarm cycles will feed the new handshake bytes into the transport.
   */
  async alarm(): Promise<void> {
    if (this._queue.length === 0) {
      return;
    }

    if (!this._transport) {
      if (this._clientAdapter && this._clientPeerId && !this._reconnecting) {
        // Discard bytes from the dead session — the client will re-send after reconnect.
        this._queue.length = 0;
        this._initiateReconnect();
      }
      return;
    }

    const messages = this._queue.splice(0);
    for (const message of messages) {
      switch (message.type) {
        case SUBDUCTION_MESSAGE_TYPE: {
          if (message.data) {
            this._transport.receiveBytes(message.data);
          }
          break;
        }
        case 'sync':
        case 'request':
        case 'ephemeral':
        case 'doc-unavailable':
        case 'remote-subscription-change':
        case 'remote-heads-changed':
          break;
        default:
          break;
      }
    }
  }

  /**
   * Simulate Cloudflare DO hard hibernation.
   *
   * The V8 isolate is killed with no notice: no teardown callbacks run, no messages
   * are sent to the client.  In-memory Subduction state is simply gone.
   *
   * `_clientAdapter` is preserved — it mirrors the WebSocket handle that CF makes
   * available via `ctx.getWebSockets()` after the DO wakes up.
   */
  hibernate(): void {
    // Unblock the pending recvBytes() so the WASM task can exit cleanly, but fire
    // no callbacks and send nothing to the client (hard kill semantics).
    this._transport?.abandonSilently();
    this._transport = undefined;
    // _clientAdapter / _clientPeerId intentionally kept (WebSocket survives hibernation).
  }

  /**
   * Pre-create the transport for the incoming reconnect handshake and signal the
   * client that a new session is required.
   *
   * In CF DO: the server sends an out-of-band "reconnect" message over the WebSocket
   * (retrieved via ctx.getWebSockets()).  Here we achieve the same effect by emitting
   * `peer-disconnected` + `peer-candidate` on the adapter — AdapterConnections handles
   * the rest automatically.
   *
   * The transport is created immediately so its recv queue is ready to buffer the
   * client's handshake bytes when they arrive on the next alarm cycle.
   */
  private _initiateReconnect(): void {
    this._reconnecting = true;
    this._transport = new ServerSubductionTransport(this._automergePeerId, this._clientPeerId!, this._clientAdapter!);
    // Accept the handshake in the background.  Bytes arrive via future alarm cycles.
    const transport = this._transport;
    void Subduction.hydrate(this._signer, this.kv, this._serviceName).then((subduction) =>
      subduction.acceptTransport(transport, this._serviceName).then(() => {
        this._reconnecting = false;
      }),
    );
    // Tell the client: old session gone, new connection needed.
    queueMicrotask(() => {
      this._clientAdapter!.emit('peer-disconnected', { peerId: this._automergePeerId });
      queueMicrotask(() => {
        this._clientAdapter!.emit('peer-candidate', { peerId: this._automergePeerId, peerMetadata: {} });
      });
    });
  }

  get queueSize(): number {
    return this._queue.length;
  }

  get isReconnecting(): boolean {
    return this._reconnecting;
  }

  get hasTransport(): boolean {
    return this._transport !== undefined;
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('edge architecture: client Repo + Subduction ↔ server DO (KV + alarm queue)', () => {
  test('syncs document from client Repo to server via alarm-dispatched Subduction transport', async ({ expect }) => {
    const CLIENT_PEER_ID = 'test-client-peer' as PeerId;
    const SERVER_PEER_ID = 'test-server-peer' as PeerId;

    const clientSigner = MemorySigner.generate();
    const serverSigner = MemorySigner.generate();

    // Server peer: SERVER_PEER_ID is the automerge-repo PeerId (separate from the
    // cryptographic Subduction PeerId derived from serverSigner).
    const serverPeer = new ServerPeer(serverSigner, SERVICE_NAME, SERVER_PEER_ID);

    // Client adapter: send() → server queue, server delivers back via deliverInbound().
    const clientAdapter = new DumbNetworkAdapter(SERVER_PEER_ID, (message) => {
      serverPeer.enqueueMessage(message);
    });

    // Start server accept — blocks until the cryptographic handshake completes.
    // The alarm loop below will feed inbound bytes to unblock it.
    const acceptPromise = serverPeer.acceptConnection(CLIENT_PEER_ID, clientAdapter);

    // Create client Repo with Subduction transport.
    // AdapterConnections will call adapter.connect() synchronously, but emits
    // peer-candidate via queueMicrotask, so connectTransport starts on the next tick.
    const clientRepo = new Repo({
      peerId: CLIENT_PEER_ID,
      signer: clientSigner,
      storage: new DummyStorageAdapter(),
      network: [],
      subductionAdapters: [{ adapter: clientAdapter, serviceName: SERVICE_NAME, role: 'connect' }],
      sharePolicy: async () => true,
      periodicSyncInterval: 200,
      batchSyncInterval: 200,
    });

    // Alarm loop: simulates Cloudflare DO alarm scheduling.
    // Runs continuously in the background, draining the server queue.
    let alarmsDone = false;
    let alarmCount = 0;
    const alarmLoop = async () => {
      while (!alarmsDone) {
        await serverPeer.alarm();
        alarmCount++;
        await pause(10);
      }
    };
    void alarmLoop();

    try {
      // Wait for the Subduction handshake to complete.
      await acceptPromise;

      // Create and mutate a document on the client.
      const handle = clientRepo.create<{ title?: string }>();
      handle.change((doc) => {
        doc.title = 'synced-via-subduction';
      });

      // Wait for the document to arrive at the server's KV store.
      // The SubductionSource in automerge-repo triggers sync on document change.
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        const ids = await serverPeer.kv.loadAllSedimentreeIds();
        if (ids.length > 0) {
          break;
        }
        await pause(50);
      }

      // Assertions.
      const storedIds = await serverPeer.kv.loadAllSedimentreeIds();
      expect(storedIds.length, 'server should have persisted at least one sedimentree').toBeGreaterThan(0);

      expect(
        serverPeer.observedTypes.some((t) => t === SUBDUCTION_MESSAGE_TYPE),
        'server should have observed subduction-connection messages',
      ).toBe(true);

      expect(alarmCount, 'alarm should have been triggered').toBeGreaterThan(0);
    } finally {
      alarmsDone = true;
      clientAdapter.disconnect();
      await clientRepo.shutdown();
    }
  }, 20_000);

  test('second client can load document stored by first client through server KV', async ({ expect }) => {
    const CLIENT_A_PEER_ID = 'test-client-a' as PeerId;
    const CLIENT_B_PEER_ID = 'test-client-b' as PeerId;
    const SERVER_PEER_ID = 'test-server-peer' as PeerId;

    const serverSigner = MemorySigner.generate();
    const serverPeer = new ServerPeer(serverSigner, SERVICE_NAME, SERVER_PEER_ID);

    // ── Client A: creates the document ──

    const signerA = MemorySigner.generate();
    const adapterA = new DumbNetworkAdapter(SERVER_PEER_ID, (message) => {
      serverPeer.enqueueMessage(message);
    });

    const acceptA = serverPeer.acceptConnection(CLIENT_A_PEER_ID, adapterA);

    const repoA = new Repo({
      peerId: CLIENT_A_PEER_ID,
      signer: signerA,
      storage: new DummyStorageAdapter(),
      network: [],
      subductionAdapters: [{ adapter: adapterA, serviceName: SERVICE_NAME, role: 'connect' }],
      sharePolicy: async () => true,
      periodicSyncInterval: 200,
      batchSyncInterval: 200,
    });

    let alarmsDone = false;
    const alarmLoop = async () => {
      while (!alarmsDone) {
        await serverPeer.alarm();
        await pause(10);
      }
    };
    void alarmLoop();

    try {
      await acceptA;

      const handleA = repoA.create<{ value: number }>();
      handleA.change((doc) => {
        doc.value = 42;
      });
      const docUrl = handleA.url;

      // Wait for server to store the document.
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        const ids = await serverPeer.kv.loadAllSedimentreeIds();
        if (ids.length > 0) break;
        await pause(50);
      }

      expect((await serverPeer.kv.loadAllSedimentreeIds()).length).toBeGreaterThan(0);

      // Disconnect Client A.
      adapterA.disconnect();
      await repoA.shutdown();

      // ── Client B: connects and loads the document ──

      const signerB = MemorySigner.generate();

      // Server accepts Client B — reuses the same server Subduction instance (same KV).
      const adapterB = new DumbNetworkAdapter(SERVER_PEER_ID, (message) => {
        serverPeer.enqueueMessage(message);
      });
      const acceptB = serverPeer.acceptConnection(CLIENT_B_PEER_ID, adapterB);

      const repoB = new Repo({
        peerId: CLIENT_B_PEER_ID,
        signer: signerB,
        storage: new DummyStorageAdapter(),
        network: [],
        subductionAdapters: [{ adapter: adapterB, serviceName: SERVICE_NAME, role: 'connect' }],
        sharePolicy: async () => true,
        periodicSyncInterval: 200,
        batchSyncInterval: 200,
      });

      await acceptB;

      // Client B requests the document.
      const progress = repoB.findWithProgress<{ value: number }>(docUrl);

      const deadline2 = Date.now() + 15_000;
      while (Date.now() < deadline2) {
        const state = progress.peek();
        if (state.state === 'ready' && state.handle.doc()?.value === 42) {
          break;
        }
        await pause(50);
      }

      const finalState = progress.peek();
      expect(finalState.state).toBe('ready');
      if (finalState.state === 'ready') {
        expect(finalState.handle.doc()?.value).toBe(42);
      }
    } finally {
      alarmsDone = true;
      await serverPeer.kv.loadAllSedimentreeIds().catch(() => {});
    }
  }, 30_000);

  test('server KV survives hard hibernation and alarm-driven reconnect resumes sync', async ({ expect }) => {
    // Hibernation model exercised here:
    //
    //  1. Initial session: acceptConnection() → handshake → doc1 synced to KV.
    //  2. Hard hibernation: hibernate() kills _transport with NO callbacks/signals.
    //     The client has no idea the server is gone; it keeps sending periodic sync bytes.
    //  3. Wake-up: alarm() fires, finds queued bytes but no transport.
    //     It discards the stale session bytes, pre-creates a fresh transport,
    //     and signals the client via `peer-disconnected` + `peer-candidate`.
    //     (In production CF DO this is an out-of-band WebSocket message.)
    //  4. Reconnect: AdapterConnections sees `peer-candidate` and calls connectTransport.
    //     Handshake bytes flow into the fresh transport; acceptTransport completes.
    //  5. doc2 synced to KV.  Both docs present — continuity across hibernation proven.

    const CLIENT_PEER_ID = 'test-client-hibernate' as PeerId;
    const SERVER_PEER_ID = 'test-server-hibernate' as PeerId;

    const serverPeer = new ServerPeer(MemorySigner.generate(), SERVICE_NAME, SERVER_PEER_ID);

    const clientAdapter = new DumbNetworkAdapter(SERVER_PEER_ID, (message) => {
      serverPeer.enqueueMessage(message);
    });

    // acceptConnection is called only once here (initial session).
    // After hibernation, _initiateReconnect() inside alarm() drives the re-handshake.
    const initialAccept = serverPeer.acceptConnection(CLIENT_PEER_ID, clientAdapter);

    const clientRepo = new Repo({
      peerId: CLIENT_PEER_ID,
      signer: MemorySigner.generate(),
      storage: new DummyStorageAdapter(),
      network: [],
      subductionAdapters: [{ adapter: clientAdapter, serviceName: SERVICE_NAME, role: 'connect' }],
      sharePolicy: async () => true,
      periodicSyncInterval: 200,
      batchSyncInterval: 200,
    });

    let alarmsDone = false;
    const alarmLoop = async () => {
      while (!alarmsDone) {
        await serverPeer.alarm();
        await pause(10);
      }
    };
    void alarmLoop();

    try {
      // ── Phase 1: initial session ──
      await initialAccept;

      const handle1 = clientRepo.create<{ seq: number }>();
      handle1.change((doc) => {
        doc.seq = 1;
      });

      const deadline1 = Date.now() + 15_000;
      while (Date.now() < deadline1) {
        if ((await serverPeer.kv.loadAllSedimentreeIds()).length > 0) {
          break;
        }
        await pause(50);
      }
      expect(
        (await serverPeer.kv.loadAllSedimentreeIds()).length,
        'doc1 should be in KV after session 1',
      ).toBeGreaterThan(0);

      // ── Phase 2: hard hibernation ──
      // No callbacks, no graceful close — process is just killed.
      // The client keeps sending periodic sync bytes (periodicSyncInterval = 200ms).
      serverPeer.hibernate();

      // Wait for alarm() to detect the stale-bytes-no-transport situation and
      // trigger _initiateReconnect(), which signals the client and completes the
      // new handshake in the background.
      const deadline2 = Date.now() + 15_000;
      while (Date.now() < deadline2) {
        // _reconnecting flips back to false when acceptTransport completes.
        if (!serverPeer.isReconnecting && serverPeer.hasTransport) {
          break;
        }
        await pause(50);
      }
      expect(serverPeer.hasTransport, 'transport should be re-established after reconnect').toBe(true);

      // ── Phase 3: second document after reconnect ──
      const handle2 = clientRepo.create<{ seq: number }>();
      handle2.change((doc) => {
        doc.seq = 2;
      });

      const deadline3 = Date.now() + 15_000;
      while (Date.now() < deadline3) {
        if ((await serverPeer.kv.loadAllSedimentreeIds()).length >= 2) {
          break;
        }
        await pause(50);
      }

      expect(
        (await serverPeer.kv.loadAllSedimentreeIds()).length,
        'both documents should be in KV after reconnect',
      ).toBeGreaterThanOrEqual(2);
    } finally {
      alarmsDone = true;
      clientAdapter.disconnect();
      await clientRepo.shutdown();
    }
  }, 40_000);
});
