//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Stream } from '@dxos/async';
import { getBufService } from '@dxos/protocols/buf-service';
import { schema } from '@dxos/protocols/proto';
import {
  type TestRpcResponse,
  type TestService,
  type TestStreamService,
} from '@dxos/protocols/proto/example/testing/rpc';
import { type ServiceDescriptorLike } from '@dxos/protocols/service-contract';

import { type ProtoRpcPeer, createProtoRpcPeer } from './service';
import { createLinkedPorts } from './testing';

// `#8`: a `DescService`-backed descriptor must be interchangeable with the protobuf.js one on a live
// port, in either direction, because a released peer on one side will meet a rebuilt peer on the
// other. Mixing the two implementations per test is the point -- a buf-to-buf test alone would not
// exercise the wire compatibility this thread risks.

const SERVICE = 'example.testing.rpc.TestService';
const STREAM_SERVICE = 'example.testing.rpc.TestStreamService';

describe('Buf service descriptor', () => {
  test('exposes the same service name as the legacy descriptor', ({ expect }) => {
    expect(bufService().name).toEqual(schema.getService(SERVICE).name);
    expect(bufService().name).toEqual(SERVICE);
  });

  test('buf client calls a legacy server', async ({ expect }) => {
    expect(await callAcross(schema.getService(SERVICE), bufService(), 'a')).toEqual('echo:a');
  });

  test('legacy client calls a buf server', async ({ expect }) => {
    expect(await callAcross(bufService(), schema.getService(SERVICE), 'b')).toEqual('echo:b');
  });

  test('buf on both sides', async ({ expect }) => {
    expect(await callAcross(bufService(), bufService(), 'c')).toEqual('echo:c');
  });

  test('a void method round-trips', async ({ expect }) => {
    // `google.protobuf.Empty` decodes to `{}` on both implementations, verified against the legacy
    // client rather than assumed.
    await withPeers(
      () => openUnary(schema.getService(SERVICE), bufService()),
      async (client) => {
        expect(await client.rpc.TestService.voidCall()).toEqual({});
      },
    );
  });

  test('a server-streaming method round-trips from a legacy server to a buf client', async ({ expect }) => {
    expect(await streamAcross(schema.getService(STREAM_SERVICE), bufStreamService())).toEqual(['one', 'two']);
  });

  test('a server-streaming method round-trips from a buf server to a legacy client', async ({ expect }) => {
    // `BufServiceHandler.callStream` writes each element's response `type_url` through a different
    // path from the legacy handler, so one direction does not imply the other.
    expect(await streamAcross(bufStreamService(), schema.getService(STREAM_SERVICE))).toEqual(['one', 'two']);
  });
});

const bufService = () => getBufService<TestService>(SERVICE);
const bufStreamService = () => getBufService<TestStreamService>(STREAM_SERVICE);

const unaryHandlers = {
  TestService: {
    testCall: async (req: { data?: string }) => ({ data: `echo:${req.data}` }),
    voidCall: async () => {},
  },
};

const streamHandlers = {
  TestStreamService: {
    testCall: () =>
      new Stream<TestRpcResponse>(({ next, close }) => {
        next({ data: 'one' });
        next({ data: 'two' });
        close();
      }),
  },
};

/** Closes both peers so a failed assertion cannot leave the port listeners subscribed. */
const withPeers = async <T>(
  open: () => { server: ProtoRpcPeer<unknown>; client: ProtoRpcPeer<T> },
  body: (client: ProtoRpcPeer<T>) => Promise<void>,
): Promise<void> => {
  const { server, client } = open();
  await Promise.all([server.open(), client.open()]);
  try {
    await body(client);
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
};

type UnaryBundle = { TestService: TestService };
type StreamBundle = { TestStreamService: TestStreamService };

const openUnary = (exposed: ServiceDescriptorLike<TestService>, requested: ServiceDescriptorLike<TestService>) => {
  const [clientPort, serverPort] = createLinkedPorts();
  return {
    server: createProtoRpcPeer<{}, UnaryBundle>({
      exposed: { TestService: exposed },
      handlers: unaryHandlers,
      port: serverPort,
    }),
    client: createProtoRpcPeer<UnaryBundle>({ requested: { TestService: requested }, port: clientPort }),
  };
};

const openStream = (
  exposed: ServiceDescriptorLike<TestStreamService>,
  requested: ServiceDescriptorLike<TestStreamService>,
) => {
  const [clientPort, serverPort] = createLinkedPorts();
  return {
    server: createProtoRpcPeer<{}, StreamBundle>({
      exposed: { TestStreamService: exposed },
      handlers: streamHandlers,
      port: serverPort,
    }),
    client: createProtoRpcPeer<StreamBundle>({ requested: { TestStreamService: requested }, port: clientPort }),
  };
};

const callAcross = async (
  exposed: ServiceDescriptorLike<TestService>,
  requested: ServiceDescriptorLike<TestService>,
  data: string,
): Promise<string | undefined> => {
  let result: string | undefined;
  await withPeers(
    () => openUnary(exposed, requested),
    async (client) => {
      result = (await client.rpc.TestService.testCall({ data })).data;
    },
  );

  return result;
};

const streamAcross = async (
  exposed: ServiceDescriptorLike<TestStreamService>,
  requested: ServiceDescriptorLike<TestStreamService>,
): Promise<string[]> => {
  const received: string[] = [];
  await withPeers(
    () => openStream(exposed, requested),
    (client) =>
      new Promise<void>((resolve, reject) => {
        client.rpc.TestStreamService.testCall({ data: 'go' }).subscribe(
          (msg) => received.push(msg.data!),
          (err) => (err ? reject(err) : resolve()),
        );
      }),
  );

  return received;
};
