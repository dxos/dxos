//
// Copyright 2020 DXOS.org
//

import { type AddressInfo, Socket, type Server } from 'node:net';

import { Event } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { log } from '@dxos/log';
import { type Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { type Transport, type TransportFactory, type TransportOptions, type TransportStats } from './transport';

export const TcpTransportFactory: TransportFactory = {
  createTransport: (params) => new TcpTransport(params),
};

/**
 * Fake transport.
 */
export class TcpTransport implements Transport {
  private _server?: Server = undefined;
  private _socket?: Socket = undefined;

  public readonly closed = new Event<void>();
  public readonly connected = new Event<void>();
  public readonly errors = new ErrorStream();

  private _destroyed = false;

  private _connected = false;

  constructor(private readonly options: TransportOptions) {
    log('creating');

    // Initiator will send a signal, the receiver will receive the unique ID and connect the streams.
    if (this.options.initiator) {
      // prettier-ignore
      setTimeout(async () => {
        const { Server } = await import('node:net');
        this._server = new Server(socket => {
          log('new connection');
          if (this._connected) {
            socket.destroy();
          }
          this._handleSocket(socket);
        });

        this._server.on('listening', () => {
          const { port } = this._server!.address() as AddressInfo;
          log('listening', { port });
          void this.options.sendSignal({
            payload: { port }
          }).catch(err => {
            if (!this._destroyed) {
              this.errors.raise(err);
            }
          });

        });

        this._server.on('error', err => {
          this.errors.raise(err);
        });

        this._server.listen(0);
      });
    }
  }

  async open() {}

  async close() {
    log('closing');
    this._socket?.destroy();
    this._server?.close();
    this._destroyed = true;
  }

  async signal({ payload }: Signal) {
    log('received signal', { payload });
    if (this.options.initiator || this._connected) {
      return;
    }

    const socket = new Socket();
    this._handleSocket(socket);
    socket.connect({ port: payload.port, host: 'localhost' });
  }

  async getDetails(): Promise<string> {
    if (this.options.initiator) {
      const { port, address } = this._server?.address() as AddressInfo;
      return `LISTEN ${address}:${port}`;
    }
    const { port, address } = this._socket?.address() as AddressInfo;
    return `ACCEPT ${address}:${port}`;
  }

  async getStats(): Promise<TransportStats> {
    return {
      bytesSent: 0,
      bytesReceived: 0,
      packetsSent: 0,
      packetsReceived: 0,
    };
  }

  private _handleSocket(socket: Socket) {
    log('handling socket', { remotePort: socket.remotePort, localPort: socket.localPort });
    this._socket = socket;
    this.connected.emit();
    this.options.stream.pipe(this._socket!).pipe(this.options.stream);

    this._socket.on('connect', () => {
      log('connected to', { port: this._socket?.remotePort });
      this._connected = true;
    });
    this._socket.on('error', (err) => {
      this.errors.raise(err);
    });
    this._socket.on('close', () => {
      this.closed.emit();
    });
  }
}
