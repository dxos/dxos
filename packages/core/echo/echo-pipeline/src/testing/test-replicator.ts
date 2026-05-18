//
// Copyright 2024 DXOS.org
//

import { sleep, synchronized } from '@dxos/async';
import { type Context, LifecycleState, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import type { AutomergeProtocolMessage } from '@dxos/protocols';
import * as TeleportAutomergeReplicator from '@dxos/teleport-extension-automerge-replicator';

import type { AutomergeReplicator, AutomergeReplicatorConnection, AutomergeReplicatorContext } from '../automerge';
import type { ShouldAdvertiseProps } from '../automerge/echo-replicator';

export type TestReplicatorNetworkOptions = {
  latency?: number;
};

/**
 * Per-connection `shouldAdvertise` predicate evaluated against the local peer's
 * declared id (whichever peer constructed the `TestReplicator`) and the document.
 */
export type TestShouldAdvertise = (params: ShouldAdvertiseProps) => boolean | Promise<boolean>;

export class TestReplicationNetwork extends Resource {
  private readonly _replicators = new Set<TestReplicator>();
  private readonly _latency?: number = undefined;

  constructor(options: TestReplicatorNetworkOptions = {}) {
    super();
    this._latency = options.latency;
  }

  protected override async _close(_ctx: Context): Promise<void> {
    for (const replicator of this._replicators) {
      for (const connection of replicator.connections) {
        void connection.writable.abort();
        void connection.readable.cancel();
      }
    }
  }

  async createReplicator(options?: { shouldAdvertise?: TestShouldAdvertise }): Promise<TestReplicator> {
    const replicator = new TestReplicator({
      shouldAdvertise: options?.shouldAdvertise,
      onConnect: async () => {
        invariant(this._lifecycleState === LifecycleState.OPEN);
        await this._connectReplicator(replicator);
      },
      onDisconnect: async () => {
        invariant(this._lifecycleState === LifecycleState.OPEN);
        await this._disconnectReplicator(replicator);
      },
    });
    this._replicators.add(replicator);
    return replicator;
  }

  @synchronized
  private async _connectReplicator(replicator: TestReplicator): Promise<void> {
    for (const otherReplicator of this._replicators.values()) {
      if (otherReplicator === replicator || !otherReplicator.connected) {
        continue;
      }
      log('create connection', { from: replicator.context!.peerId, to: otherReplicator.context!.peerId });
      const [connection1, connection2] = this._createConnectionPair(
        replicator.context!.peerId,
        otherReplicator.context!.peerId,
        replicator,
        otherReplicator,
      );
      await replicator.context!.onConnectionOpen(connection1);
      await otherReplicator.context!.onConnectionOpen(connection2);
    }
  }

  private async _disconnectReplicator(replicator: TestReplicator): Promise<void> {
    for (const connection of replicator.connections) {
      await replicator.context!.onConnectionClosed(connection);
      await connection.otherSide!.owningReplicator!.removeConnection(connection.otherSide!);
    }
  }

  private _createConnectionPair(
    peer1: string,
    peer2: string,
    replicator1: TestReplicator,
    replicator2: TestReplicator,
  ): [TestReplicatorConnection, TestReplicatorConnection] {
    const LOG = false;

    const forward = new TransformStream({
      transform: async (message, controller) => {
        if (LOG) {
          log('replicate', { from: peer1, to: peer2, message });
        }

        if (this._latency !== undefined) {
          await sleep(this._latency);
        }

        controller.enqueue(message);
      },
    });
    const backwards = new TransformStream({
      transform: async (message, controller) => {
        if (LOG) {
          log('replicate', { from: peer2, to: peer1, message });
        }

        if (this._latency !== undefined) {
          await sleep(this._latency);
        }

        controller.enqueue(message);
      },
    });

    const connection1 = new TestReplicatorConnection(
      peer2,
      backwards.readable,
      forward.writable,
      replicator1.shouldAdvertiseCallback,
    );
    const connection2 = new TestReplicatorConnection(
      peer1,
      forward.readable,
      backwards.writable,
      replicator2.shouldAdvertiseCallback,
    );
    connection1.otherSide = connection2;
    connection2.otherSide = connection1;
    return [connection1, connection2];
  }
}

type TestReplicatorProps = {
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  shouldAdvertise?: TestShouldAdvertise;
};

export class TestReplicator implements AutomergeReplicator {
  public connected = false;
  public context: AutomergeReplicatorContext | undefined = undefined;
  public connections = new Set<TestReplicatorConnection>();

  /** Live `shouldAdvertise` callback evaluated by connections on this side. */
  shouldAdvertise: TestShouldAdvertise | undefined;

  constructor(private readonly _params: TestReplicatorProps) {
    this.shouldAdvertise = _params.shouldAdvertise;
  }

  /** Indirection so connections re-read the current value (allows post-construction flips). */
  get shouldAdvertiseCallback(): TestShouldAdvertise | undefined {
    return this.shouldAdvertise ? (params) => this.shouldAdvertise!(params) : undefined;
  }

  async connect(_ctx: Context, context: AutomergeReplicatorContext): Promise<void> {
    log('connect', { peerId: context.peerId });
    this.context = context;
    this.connected = true;
    await this._params.onConnect();
  }

  async disconnect(): Promise<void> {
    log('disconnect', { peerId: this.context!.peerId });
    this.connected = false;
    await this._params.onDisconnect();
  }

  async addConnection(connection: TestReplicatorConnection): Promise<void> {
    connection.owningReplicator = this;
    this.connections.add(connection);
    this.context!.onConnectionOpen(connection);
  }

  async removeConnection(connection: TestReplicatorConnection): Promise<void> {
    connection.owningReplicator = undefined;
    this.context!.onConnectionClosed(connection);
    this.connections.delete(connection);
  }
}

export class TestReplicatorConnection implements AutomergeReplicatorConnection {
  public otherSide: TestReplicatorConnection | undefined = undefined;
  public owningReplicator: TestReplicator | undefined = undefined;

  constructor(
    public readonly peerId: string,
    public readonly readable: ReadableStream<AutomergeProtocolMessage>,
    public readonly writable: WritableStream<AutomergeProtocolMessage>,
    private readonly _shouldAdvertise?: TestShouldAdvertise,
  ) {}

  get bundleSyncEnabled(): boolean {
    return false;
  }

  async shouldAdvertise(params: ShouldAdvertiseProps): Promise<boolean> {
    return this._shouldAdvertise ? this._shouldAdvertise(params) : true;
  }

  shouldSyncCollection(): boolean {
    return true;
  }
}

export const testAutomergeReplicatorFactory: TeleportAutomergeReplicator.AutomergeReplicatorFactory = (params) => {
  return new TeleportAutomergeReplicator.AutomergeReplicator(
    {
      ...params[0],
      sendSyncRetryPolicy: {
        retryBackoff: 20,
        retriesBeforeBackoff: 2,
        maxRetries: 3,
      },
    },
    params[1],
  );
};

export const brokenAutomergeReplicatorFactory: TeleportAutomergeReplicator.AutomergeReplicatorFactory = (params) => {
  params[1]!.onSyncMessage = () => {
    throw new Error();
  };

  return testAutomergeReplicatorFactory(params);
};
