//
// Copyright 2024 DXOS.org
//

import { sleep, synchronized } from '@dxos/async';
import { type Context, LifecycleState, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import type { AutomergeProtocolMessage } from '@dxos/protocols';
import { AutomergeReplicator, type AutomergeReplicatorFactory } from '@dxos/teleport-extension-automerge-replicator';

import type {
  EchoReplicator,
  EchoReplicatorContext,
  ReplicatorConnection,
  ShouldAdvertiseParams,
  ShouldSyncCollectionParams,
} from '../automerge';

export type TestReplicatorNetworkOptions = {
  latency?: number;
};

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

  async createReplicator(): Promise<TestReplicator> {
    const replicator = new TestReplicator({
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

  private _createConnectionPair(peer1: string, peer2: string): [TestReplicatorConnection, TestReplicatorConnection] {
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

    const connection1 = new TestReplicatorConnection(peer2, backwards.readable, forward.writable);
    const connection2 = new TestReplicatorConnection(peer1, forward.readable, backwards.writable);
    connection1.otherSide = connection2;
    connection2.otherSide = connection1;
    return [connection1, connection2];
  }
}

type TestReplicatorParams = {
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
};

export class TestReplicator implements EchoReplicator {
  constructor(private readonly _params: TestReplicatorParams) {}

  public connected = false;
  public context: EchoReplicatorContext | undefined = undefined;
  public connections = new Set<TestReplicatorConnection>();

  async connect(context: EchoReplicatorContext): Promise<void> {
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

export class TestReplicatorConnection implements ReplicatorConnection {
  public otherSide: TestReplicatorConnection | undefined = undefined;
  public owningReplicator: TestReplicator | undefined = undefined;

  constructor(
    public readonly peerId: string,
    public readonly readable: ReadableStream<AutomergeProtocolMessage>,
    public readonly writable: WritableStream<AutomergeProtocolMessage>,
  ) {}

  get bundleSyncEnabled(): boolean {
    return false;
  }

  async shouldAdvertise(_params: ShouldAdvertiseParams): Promise<boolean> {
    return true;
  }

  shouldSyncCollection(_params: ShouldSyncCollectionParams): boolean {
    return true;
  }
}

export const testAutomergeReplicatorFactory: AutomergeReplicatorFactory = (params) => {
  return new AutomergeReplicator(
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

export const brokenAutomergeReplicatorFactory: AutomergeReplicatorFactory = (params) => {
  params[1]!.onSyncMessage = () => {
    throw new Error();
  };

  return testAutomergeReplicatorFactory(params);
};
