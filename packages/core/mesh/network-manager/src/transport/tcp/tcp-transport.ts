//
// Copyright 2020 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { type AddressInfo, type Server, Socket } from 'node:net';

import { Event } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Signal, SignalSchema } from '@dxos/protocols/buf/dxos/mesh/swarm_pb';
import { type DuplexStream, connectDuplexStreams } from '@dxos/teleport';

import { type Transport, type TransportFactory, type TransportOptions, type TransportStats } from '../transport.ts';

export const TcpTransportFactory: TransportFactory = {
  createTransport: (options) => new TcpTransport(options),
};

/**
 * Fake transport.
 */
export class TcpTransport implements Transport {
  private _server?: Server = undefined;
  private _socket?: Socket = undefined;

  private _connected = false;
  private _closed = false;

  public readonly closed = new Event<void>();
  public readonly connected = new Event<void>();
  public readonly errors = new ErrorStream();

  constructor(private readonly options: TransportOptions) {}

  get isOpen() {
    return this._connected && !this._closed;
  }

  async open(): Promise<this> {
    log('opening');

    // Initiator will send a signal, the receiver will receive the unique ID and connect the streams.
    if (this.options.initiator) {
      // TODO(burdon): Why timeout?
      setTimeout(async () => {
        const { Server } = await import('node:net');
        this._server = new Server((socket) => {
          log('new connection');
          if (this._connected) {
            socket.destroy();
          }
          this._handleSocket(socket);
        });

        this._server.on('listening', () => {
          const { port } = this._server!.address() as AddressInfo;
          log('listening', { port });
          void this.options.sendSignal(create(SignalSchema, { payload: { port } })).catch((err) => {
            if (!this._closed) {
              this.errors.raise(err);
            }
          });
        });

        this._server.on('error', (err) => {
          this.errors.raise(err);
        });

        this._server.listen(0);
      });
    }
    return this;
  }

  async close(): Promise<this> {
    log('closing');
    this._socket?.destroy();
    this._server?.close();
    this._closed = true;
    return this;
  }

  async onSignal({ payload }: Signal): Promise<void> {
    log('received signal', { payload });
    if (this.options.initiator || this._connected) {
      return;
    }

    const port = payload?.port;
    invariant(typeof port === 'number', 'Signal carries no listening port.');
    const socket = new Socket();
    this._handleSocket(socket);
    socket.connect({ port, host: 'localhost' });
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

  private _handleSocket(socket: Socket): void {
    log('handling socket', { remotePort: socket.remotePort, localPort: socket.localPort });
    this._socket = socket;

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

    this.connected.emit();
    connectDuplexStreams(socketToDuplexStream(this._socket!), this.options.stream, (err) => {
      // A pipe rejecting is how a connection normally ends, and `socket.on('error')` above already
      // raises the real faults; re-raising here would report every disconnect twice.
      log('pipe ended', { err });
    });
  }
}

/**
 * Adapts a Node socket to the web-stream seam.
 *
 * Hand-written because `Duplex.toWeb` returns `node:stream/web`'s `ReadableStream`, a different
 * declaration from the global one the seam is typed with.
 */
const socketToDuplexStream = (socket: Socket): DuplexStream => {
  let detach = () => {};

  return {
    readable: new ReadableStream<Uint8Array>({
      start: (controller) => {
        let ended = false;
        const end = (err?: Error) => {
          if (ended) {
            return;
          }
          ended = true;
          detach();
          try {
            err ? controller.error(err) : controller.close();
          } catch {
            // Already closed, errored or cancelled by the consumer.
          }
        };

        // Copied: socket chunks come from a shared pool, so holding the view would alias later reads.
        const onData = (data: Buffer) => {
          controller.enqueue(new Uint8Array(data));
          // The socket has no view of the stream's queue, so backpressure is relayed by hand.
          if ((controller.desiredSize ?? 0) <= 0) {
            socket.pause();
          }
        };
        const onEnd = () => end();
        const onError = (err: Error) => end(err);
        // `close` also covers `destroy()`, which tears the socket down without ever emitting `end`.
        const onClose = () => end();

        detach = () => {
          socket.off('data', onData);
          socket.off('end', onEnd);
          socket.off('error', onError);
          socket.off('close', onClose);
        };

        socket.on('data', onData);
        socket.on('end', onEnd);
        socket.on('error', onError);
        socket.on('close', onClose);
      },
      pull: () => {
        socket.resume();
      },
      cancel: () => {
        detach();
        socket.destroy();
      },
    }),
    writable: new WritableStream<Uint8Array>({
      write: async (chunk) => {
        if (!socket.write(chunk)) {
          // `drain` is the socket's backpressure signal, mapped onto the write promise. An error or
          // a close while parked here must settle it too, or the writer outlives the transport.
          await new Promise<void>((resolve, reject) => {
            const settle = (err?: Error) => {
              socket.off('drain', onDrain);
              socket.off('error', onWriteError);
              socket.off('close', onWriteClose);
              err ? reject(err) : resolve();
            };
            const onDrain = () => settle();
            const onWriteError = (err: Error) => settle(err);
            const onWriteClose = () => settle(new Error('Socket closed while awaiting drain.'));
            socket.once('drain', onDrain);
            socket.once('error', onWriteError);
            socket.once('close', onWriteClose);
          });
        }
      },
      close: () => {
        socket.end();
      },
    }),
  };
};
