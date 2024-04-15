//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';

import { type Transport, type TransportFactory, type TransportStats } from './transport';

// NOTE: Browser stub.

export const TcpTransportFactory: TransportFactory = {
  createTransport: () => new TcpTransport(),
};

export class TcpTransport implements Transport {
  public readonly closed = new Event<void>();
  public readonly connected = new Event<void>();
  public readonly errors = new ErrorStream();

  async open() {}

  async close() {
    throw new Error('Method not implemented.');
  }

  signal() {
    throw new Error('Method not implemented.');
  }

  async getStats(): Promise<TransportStats> {
    throw new Error('Method not implemented.');
  }

  async getDetails(): Promise<string> {
    throw new Error('Method not implemented.');
  }
}
