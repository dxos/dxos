import WebSocket from "ws";
import { Signal } from "../proto/gen/dxos/mesh/signal";
import { createBundledRpcClient, createBundledRpcServer, ProtoRpcClient } from '@dxos/rpc'
import { schema } from "../proto/gen";
import debug  from "debug";
import { PubKey, PublicKey } from "@dxos/protocols";
import { Trigger } from "@dxos/async";

interface Services {
  Signal: Signal
}

const log = debug('dxos:network-manager:signal-client');

export class NewSignalClient {
  private readonly _socket: WebSocket
  private readonly _rpc: ProtoRpcClient<Services>
  private readonly _connectTrigger = new Trigger();

  constructor(
    private readonly _url: string,
  ) {
    this._socket = new WebSocket(this._url);
    this._socket.onopen = async () => {
      try {
        await this._rpc.open();
        log(`RPC open ${this._url}`);
        this._connectTrigger.wake();
        // this.connected.emit();
      } catch (err: any) {
        // this.error.emit(err);
      }
    };

    this._socket.onclose = async () => {
      log(`Disconnected ${this._url}`);
      // this.disconnected.emit();
      try {
        await this._rpc.close();
      } catch (err: any) {
        // this.error.emit(err);
      }
    };

    this._socket.onerror = e => {
      log(`Signal socket error ${this._url} ${e.message}`);
      // this.error.emit(e.error ?? new Error(e.message));
    };

    this._rpc = createBundledRpcClient(
      {
        Signal: schema.getService('dxos.mesh.signal.Signal'),
      },
      {
        noHandshake: true,
        port: {
          send: msg => {
            console.log('send', msg)
            this._socket.send(msg)
          },
          subscribe: cb => {
            this._socket.onmessage = msg => {
              console.log('rcv', msg.data)
              cb(msg.data)
            }
          }
        }
      }
    )
  }

  async open() {
    await this._connectTrigger.wait();
    await this._rpc.open();
  }

  join(topic: PublicKey, peerId: PublicKey) {
    return this._rpc.rpc.Signal.join({
      swarm: topic.asUint8Array(),
      peer: peerId.asUint8Array(),
    })
  }
}