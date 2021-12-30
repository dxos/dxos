//
// Copyright 2021 DXOS.org
//

import { Client, clientServiceBundle, ClientServices } from '@dxos/client';
import { schema } from '@dxos/client/src/proto/gen';
import { MessageTrace } from '@dxos/client/src/proto/gen/dxos/rpc';
import { createBundledRpcServer, RpcPort, RpcPeer, PortTracer } from '@dxos/rpc';
import { SubscriptionGroup } from "@dxos/util";
import { Stream } from '@dxos/codec-protobuf';
import assert from 'assert';

import { config } from './config';
import { Event } from '@dxos/async';

export class BackgroundServer {
  private readonly _client: Client = new Client(config);

  // Active and potentially closed connections.
  private readonly _connections = new Set<RpcPeer>();

  public async open () {
    await this._client.initialize();
  }

  public async close () {
    await Promise.all(Array.from(this._connections).map(peer => peer.close()));

    await this._client.destroy();
  }

  /**
   * Handle incoming connection on provided port.
   *
   * Will block until connection handshake is completed.
   */
  public async handlePort (port: RpcPort) {
    const tracer = new PortTracer(port);
    const collector = new TraceCollector(tracer);

    const handlers: ClientServices = {
      ...this._client.services,
      SystemService: {
        ...this._client.services.SystemService,
        Reset: async () => {
          await this._client.services.SystemService.Reset();
          // Override the Rest handler with a reload - Client does not recover properly after reset.
          window.location.reload();
        }
      },
      TracingService: {
        SetTracingOptions: async ({ enable }) => {
          collector.setEnabled(enable ?? false);
        },
        SubscribeToRpcTrace: () => collector.getMessageStream(),
      }
    };

    const server = createBundledRpcServer({
      services: clientServiceBundle,
      handlers,
      port: tracer.port,
    });
    this._connections.add(server);
    await server.open(); // This is blocks until the other client connects.
  }
}

export class TraceCollector {
  private readonly _subscriptions = new SubscriptionGroup();

  private _messages: MessageTrace[] = [];
  private readonly _ids = new Set<number>();

  private readonly _message = new Event<MessageTrace>();
  
  constructor(
    private readonly _tracer: PortTracer,
  ) {}

  setEnabled(enabled: boolean) {
    if(enabled) {
      this._subscriptions.push(this._tracer.message.on(msg => {
        assert(msg.data)
        const inner = schema.getCodecForType('dxos.rpc.RpcMessage').decode(msg.data);
        if(inner.request) {
          if(inner.request.method?.startsWith('TracingService.')) {
            return;
          }

          assert(inner.request.id);
          this._ids.add(inner.request.id);
        } else if (inner.response) {
          assert(inner.response.id);
          if(!this._ids.has(inner.response.id)) {
            return;
          }
        }

        this._messages.push(msg);
        this._message.emit(msg);
      }));
    } else {
      this._subscriptions.unsubscribe();
      this._messages = [];
      this._ids.clear();
    }
  }

  getMessageStream(): Stream<MessageTrace> {
    return new Stream(({ next }) => {
      for(const msg of this._messages) {
        next(msg);
      }

      return this._message.on(next);
    });
  }
}