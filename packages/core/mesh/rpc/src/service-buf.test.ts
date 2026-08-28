//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Stream } from '@dxos/async';
import { getBufService } from '@dxos/protocols/buf-service';
import { schema } from '@dxos/protocols/proto';
import {
  type TestRpcResponse,
  type TestService,
  type TestStreamService,
} from '@dxos/protocols/proto/example/testing/rpc';

import { createProtoRpcPeer } from './service';
import { createLinkedPorts } from './testing';

// `#8`: a `DescService`-backed descriptor must be interchangeable with the protobuf.js one on a live
// port, in either direction, because a released peer on one side will meet a rebuilt peer on the
// other. Mixing the two implementations per test is the point -- a buf-to-buf test alone would not
// exercise the wire compatibility this thread risks.

const SERVICE = 'example.testing.rpc.TestService';
const STREAM_SERVICE = 'example.testing.rpc.TestStreamService';

const legacyService = () => schema.getService(SERVICE);
const bufService = () => getBufService<TestService>(SERVICE);

const handlers = {
  TestService: {
    testCall: async (req: { data?: string }) => ({ data: `echo:${req.data}` }),
    voidCall: async () => {},
  },
};

describe('Buf service descriptor', () => {
  test('exposes the same service name as the legacy descriptor', () => {
    expect(bufService().name).toEqual(legacyService().name);
    expect(bufService().name).toEqual(SERVICE);
  });

  test('buf client calls a legacy server', async () => {
    const [clientPort, serverPort] = createLinkedPorts();
    const server = createProtoRpcPeer({ exposed: { TestService: legacyService() }, handlers, port: serverPort });
    const client = createProtoRpcPeer({ requested: { TestService: bufService() }, port: clientPort });
    await Promise.all([server.open(), client.open()]);

    expect((await client.rpc.TestService.testCall({ data: 'a' })).data).toEqual('echo:a');
  });

  test('legacy client calls a buf server', async () => {
    const [clientPort, serverPort] = createLinkedPorts();
    const server = createProtoRpcPeer({ exposed: { TestService: bufService() }, handlers, port: serverPort });
    const client = createProtoRpcPeer({ requested: { TestService: legacyService() }, port: clientPort });
    await Promise.all([server.open(), client.open()]);

    expect((await client.rpc.TestService.testCall({ data: 'b' })).data).toEqual('echo:b');
  });

  test('buf on both sides', async () => {
    const [clientPort, serverPort] = createLinkedPorts();
    const server = createProtoRpcPeer({ exposed: { TestService: bufService() }, handlers, port: serverPort });
    const client = createProtoRpcPeer({ requested: { TestService: bufService() }, port: clientPort });
    await Promise.all([server.open(), client.open()]);

    expect((await client.rpc.TestService.testCall({ data: 'c' })).data).toEqual('echo:c');
  });

  test('a void method round-trips', async () => {
    const [clientPort, serverPort] = createLinkedPorts();
    const server = createProtoRpcPeer({ exposed: { TestService: legacyService() }, handlers, port: serverPort });
    const client = createProtoRpcPeer({ requested: { TestService: bufService() }, port: clientPort });
    await Promise.all([server.open(), client.open()]);

    // `google.protobuf.Empty` decodes to `{}` on both implementations, verified against the legacy
    // client rather than assumed.
    expect(await client.rpc.TestService.voidCall()).toEqual({});
  });

  test('a server-streaming method round-trips from a legacy server to a buf client', async () => {
    const [clientPort, serverPort] = createLinkedPorts();
    const server = createProtoRpcPeer({
      exposed: { TestStreamService: schema.getService(STREAM_SERVICE) },
      handlers: {
        TestStreamService: {
          testCall: () =>
            new Stream<TestRpcResponse>(({ next, close }) => {
              next({ data: 'one' });
              next({ data: 'two' });
              close();
            }),
        },
      },
      port: serverPort,
    });
    const client = createProtoRpcPeer({
      requested: { TestStreamService: getBufService<TestStreamService>(STREAM_SERVICE) },
      port: clientPort,
    });
    await Promise.all([server.open(), client.open()]);

    const received: string[] = [];
    await new Promise<void>((resolve, reject) => {
      client.rpc.TestStreamService.testCall({ data: 'go' }).subscribe(
        (msg) => received.push(msg.data!),
        (err) => (err ? reject(err) : resolve()),
      );
    });

    expect(received).toEqual(['one', 'two']);
  });
});
