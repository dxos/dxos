//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { Duplex } from 'node:stream';
import { describe, test } from 'vitest';

import { Event as AsyncEvent, sleep } from '@dxos/async';
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
    return {} as TransportStats;
  }

  async getDetails(): Promise<string> {
    return '';
  }
}

const setup = () => {
  // What the bridge pushed towards the transport, which is where a delivered write lands.
  const delivered: Uint8Array[] = [];
  const factory = {
    createTransport: (options: TransportOptions): Transport => {
      options.stream.pipe(
        new Duplex({
          read: () => {},
          write: (chunk, _encoding, callback) => {
            delivered.push(new Uint8Array(chunk));
            callback();
          },
        }),
      );
      return new StubTransport();
    },
  };
  return { service: new RtcTransportService(undefined, undefined, factory), delivered };
};

const openTransport = async (service: RtcTransportService, proxyId: PublicKey) => {
  const stream = service.open(
    create(ConnectionRequestSchema, {
      proxyId: fromPublicKey(proxyId),
      ownPeerKey: PublicKey.random().toHex(),
      remotePeerKey: PublicKey.random().toHex(),
      topic: PublicKey.random().toHex(),
      initiator: true,
    }),
  );
  await stream.waitUntilReady();
  return stream;
};

describe('RtcTransportService', () => {
  // The bridge runs in the tab and the proxy in a worker, so a close travels the event stream while
  // data travels a separate call. Failing the late write is reported as a transport error, and the
  // swarm answers that by tearing down whatever connection it currently holds to that peer —
  // including a replacement one opened after the write was issued.
  test('a write for a transport this bridge closed is dropped', async ({ expect }) => {
    const { service } = setup();
    const proxyId = PublicKey.random();
    await openTransport(service, proxyId);
    await service.close(create(CloseRequestSchema, { proxyId: fromPublicKey(proxyId) }));

    await expect(
      service.sendData(create(DataRequestSchema, { proxyId: fromPublicKey(proxyId), payload: new Uint8Array([1]) })),
    ).resolves.toBeDefined();
  });

  // The wait is not a blanket accept: an id with no `open` behind it never resolves, so a live proxy
  // addressing nothing surfaces as a timeout rather than being silently swallowed.
  test('a write for a transport with no open behind it does not resolve', async ({ expect }) => {
    const { service, delivered } = setup();
    let settled = false;
    void service
      .sendData(create(DataRequestSchema, { proxyId: fromPublicKey(PublicKey.random()), payload: new Uint8Array([1]) }))
      .catch(() => {})
      .finally(() => {
        settled = true;
      });

    await sleep(50);
    expect(settled).toBe(false);
    expect(delivered).toEqual([]);
  });

  // The `open` call and the write are ordered on the wire, but the stream's producer runs a turn
  // later, so the write can reach the service while the transport is still unregistered.
  test('a write that overtakes its own open is delivered, not failed', async ({ expect }) => {
    const { service, delivered } = setup();
    const proxyId = PublicKey.random();
    const payload = new Uint8Array([4, 5, 6]);

    const stream = service.open(
      create(ConnectionRequestSchema, {
        proxyId: fromPublicKey(proxyId),
        ownPeerKey: PublicKey.random().toHex(),
        remotePeerKey: PublicKey.random().toHex(),
        topic: PublicKey.random().toHex(),
        initiator: true,
      }),
    );
    const write = service.sendData(create(DataRequestSchema, { proxyId: fromPublicKey(proxyId), payload }));
    await stream.waitUntilReady();

    await write;
    await sleep(10);
    expect(delivered).toEqual([payload]);
  });

  test('a write for a live transport is delivered', async ({ expect }) => {
    const { service, delivered } = setup();
    const proxyId = PublicKey.random();
    await openTransport(service, proxyId);
    const payload = new Uint8Array([1, 2, 3]);

    await service.sendData(create(DataRequestSchema, { proxyId: fromPublicKey(proxyId), payload }));
    await sleep(10);
    expect(delivered).toEqual([payload]);
  });
});
