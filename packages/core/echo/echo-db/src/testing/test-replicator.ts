import { synchronized } from '@dxos/async';
import { Message } from '@dxos/automerge/src/automerge-repo';
import {
  EchoReplicator,
  EchoReplicatorContext,
  ReplicatorConnection,
  ShouldAdvertizeParams,
} from '@dxos/echo-pipeline';
import { PublicKey } from '@dxos/keys';
import { Context, LifecycleState, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

export class TestReplicationNetwork extends Resource {
  private readonly _replicators = new Set<TestReplicator>();

  protected override async _close(ctx: Context): Promise<void> {
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
  private async _connectReplicator(replicator: TestReplicator) {
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

  private async _disconnectReplicator(replicator: TestReplicator) {
    for (const connection of replicator.connections) {
      await replicator.context!.onConnectionClosed(connection);
      await connection.otherSide!.owningReplicator!.removeConnection(connection.otherSide!);
    }
  }

  private _createConnectionPair(peer1: string, peer2: string): [TestReplicatorConnection, TestReplicatorConnection] {
    const LOG = false;

    const forward = new TransformStream({
      transform(message, controller) {
        if (LOG) log.info('replicate', { from: peer1, to: peer2, message });

        controller.enqueue(message);
      },
    });
    const backwards = new TransformStream({
      transform(message, controller) {
        if (LOG) log.info('replicate', { from: peer2, to: peer1, message });

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

class TestReplicatorConnection implements ReplicatorConnection {
  public otherSide: TestReplicatorConnection | undefined = undefined;
  public owningReplicator: TestReplicator | undefined = undefined;

  constructor(
    public readonly peerId: string,
    public readonly readable: ReadableStream<Message>,
    public readonly writable: WritableStream<Message>,
  ) {}

  async shouldAdvertize(params: ShouldAdvertizeParams): Promise<boolean> {
    return true;
  }
}
