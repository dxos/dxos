//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { Duplex } from 'node:stream';
import { describe, test } from 'vitest';

import { Event as AsyncEvent, Trigger } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import {
  CloseRequestSchema,
  ConnectionRequestSchema,
  DataRequestSchema,
} from '@dxos/protocols/buf/dxos/mesh/bridge_pb';

import { type Transport, type TransportOptions, type TransportStats } from '../transport.ts';
import { RtcTransportService } from './rtc-transport-service.ts';

class StubTransport implements Transport {
  readonly closed = new AsyncEvent();
  readonly connected = new AsyncEvent();
  readonly errors = new ErrorStream();

  async open(): Promise<this> {
    return this;
  }

  async close(): Promise<this> {
    return this;
  }

  async onSignal(): Promise<void> {}

  async getStats(): Promise<TransportStats> {
    return { bytesSent: 0, bytesReceived: 0, packetsSent: 0, packetsReceived: 0, rawStats: '' };
  }

  async getDetails(): Promise<string> {
    return '';
  }
}

const setup = ({ failToCreate = false }: { failToCreate?: boolean } = {}) => {
  // What the bridge pushed towards the transport, which is where a delivered write lands.
  const delivered: Uint8Array[] = [];
  const wrote = new Trigger();
  const factory = {
    createTransport: (options: TransportOptions): Transport => {
      if (failToCreate) {
        throw new Error('cannot create transport');
      }
      options.stream.pipe(
        new Duplex({
          read: () => {},
          write: (chunk, _encoding, callback) => {
            delivered.push(new Uint8Array(chunk));
            wrote.wake();
            callback();
          },
        }),
      );
      return new StubTransport();
    },
  };
  return { service: new RtcTransportService(undefined, undefined, factory), delivered, wrote };
};

const connectionRequest = (proxyId: PublicKey) =>
  create(ConnectionRequestSchema, {
    proxyId: fromPublicKey(proxyId),
    ownPeerKey: PublicKey.random().toHex(),
    remotePeerKey: PublicKey.random().toHex(),
    topic: PublicKey.random().toHex(),
    initiator: true,
  });

const dataRequest = (proxyId: PublicKey, payload: Uint8Array) =>
  create(DataRequestSchema, { proxyId: fromPublicKey(proxyId), payload });

describe('RtcTransportService', () => {
  // The proxy is told its stream is ready before this service's `open` is dispatched, so its first
  // writes arrive for a transport that does not exist yet. They carry the session handshake.
  test('a write that arrives before its own open is delivered once it registers', async ({ expect }) => {
    const { service, delivered, wrote } = setup();
    const proxyId = PublicKey.random();
    const payload = new Uint8Array([1, 2, 3]);

    const write = service.sendData(dataRequest(proxyId, payload));
    await service.open(connectionRequest(proxyId)).waitUntilReady();

    await write;
    await wrote.wait();
    expect(delivered).toEqual([payload]);
  });

  test('a write for a transport this bridge closed is dropped, not delivered', async ({ expect }) => {
    const { service, delivered } = setup();
    const proxyId = PublicKey.random();
    await service.open(connectionRequest(proxyId)).waitUntilReady();
    await service.close(create(CloseRequestSchema, { proxyId: fromPublicKey(proxyId) }));

    await service.sendData(dataRequest(proxyId, new Uint8Array([1])));
    expect(delivered).toEqual([]);
  });

  // The wait is not a blanket accept: an `open` that never produces a transport releases its waiters
  // rather than leaving them to expire, so a proxy addressing nothing learns so immediately.
  test('a write whose open fails is released rather than left waiting', async ({ expect }) => {
    const { service, delivered } = setup({ failToCreate: true });
    const proxyId = PublicKey.random();

    const write = service.sendData(dataRequest(proxyId, new Uint8Array([1])));
    service.open(connectionRequest(proxyId));

    // Were it not released, this would sit out the registration timeout, well past the test's budget.
    await write;
    expect(delivered).toEqual([]);
  });
});
