//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { Event, EventSubscriptions } from '@dxos/async';
import { createNetworkManager } from '@dxos/client';
import { ClientServicesHost, ClientServices } from '@dxos/client-services';
import { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import { schema } from '@dxos/protocols';
import { RpcMessage } from '@dxos/protocols/proto/dxos/rpc';
import { createBundledRpcServer, RpcPort, RpcPeer, PortTracer } from '@dxos/rpc';

import { config as defaultConfig } from './config';

export class BackgroundServer {
  private readonly _clientServices: ClientServicesHost;

  // Active and potentially closed connections.
  private readonly _connections = new Set<RpcPeer>();

  constructor() {
    const config = new Config(defaultConfig);
    this._clientServices = new ClientServicesHost({
      config,
      networkManager: createNetworkManager(config)
    });
  }

  public async open() {
    await this._clientServices.open();
  }

  public async close() {
    await Promise.all(Array.from(this._connections).map((peer) => peer.close()));
    await this._clientServices.close();
  }

  /**
   * Handle incoming connection on provided port.
   * Will block until connection handshake is completed.
   */
  public async handlePort(port: RpcPort) {
    const tracer = new PortTracer(port);
    const collector = new TraceCollector(tracer);

    const handlers: ClientServices = {
      ...this._clientServices.services,

      SystemService: {
        ...this._clientServices.services.SystemService,
        reset: async () => {
          await this._clientServices.services.SystemService.reset();
          // Override the Rest handler with a reload - Client does not recover properly after reset.
          window.location.reload();
        }
      },

      TracingService: {
        setTracingOptions: async ({ enable }) => {
          collector.setEnabled(enable ?? false);
        },
        subscribeToRpcTrace: () => collector.getMessageStream()
      }
    };

    const server = createBundledRpcServer({
      services: this._clientServices.descriptors,
      handlers,
      port: tracer.port
    });

    this._connections.add(server);
    await server.open(); // This is blocks until the other client connects.
  }
}

export class TraceCollector {
  private readonly _subscriptions = new EventSubscriptions();

  private _messages: RpcMessage[] = [];
  private readonly _ids = new Set<number>();

  private readonly _message = new Event<RpcMessage>();

  constructor(private readonly _tracer: PortTracer) {}

  setEnabled(enabled: boolean) {
    if (enabled) {
      this._subscriptions.add(
        this._tracer.message.on((msg) => {
          assert(msg.data);
          const inner = schema.getCodecForType('dxos.rpc.RpcMessage').decode(msg.data);
          if (inner.request) {
            if (inner.request.method?.startsWith('TracingService.')) {
              return;
            }

            assert(inner.request.id);
            this._ids.add(inner.request.id);
          } else if (inner.response) {
            assert(inner.response.id);
            if (!this._ids.has(inner.response.id)) {
              return;
            }
          }

          this._messages.push(inner);
          this._message.emit(inner);
        })
      );
    } else {
      this._subscriptions.clear();
      this._messages = [];
      this._ids.clear();
    }
  }

  getMessageStream(): Stream<RpcMessage> {
    return new Stream(({ next }) => {
      for (const msg of this._messages) {
        next(msg);
      }

      return this._message.on(next);
    });
  }
}
