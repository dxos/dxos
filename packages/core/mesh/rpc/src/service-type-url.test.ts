//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { compatCodec } from '@dxos/protocols/buf-shape-compat';
import { RpcMessageSchema } from '@dxos/protocols/buf/dxos/rpc_pb';
import { schema } from '@dxos/protocols/proto';
import { type RpcMessage } from '@dxos/protocols/proto/dxos/rpc';
import { type TestService } from '@dxos/protocols/proto/example/testing/rpc';

import { type RpcPort } from './rpc.ts';
import { type ProtoRpcPeer, createProtoRpcPeer } from './service.ts';
import { createLinkedPorts } from './testing.ts';

// `ServiceHandler` writes protobuf.js's `fullName` into `Any.type_url`, which carries a leading dot;
// buf's `DescService` reports the same type without one. These fixtures gate `#8` by proving a peer
// is indifferent to which form it receives, so the rebuild can change it.

const codec = compatCodec<RpcMessage>(RpcMessageSchema);

describe('Any.type_url across the legacy/buf service boundary', () => {
  test('the legacy service path writes a dotted type_url', async ({ expect }) => {
    const [clientPort, serverPort] = createLinkedPorts();
    const { port, seen } = rewriteOutgoingTypeUrl(clientPort, (typeUrl) => typeUrl);
    await withPair(port, serverPort, async (client) => {
      await client.rpc.TestService.testCall({ data: 'x' });
    });

    // Documents the value `#8` changes; if this stops being dotted the rebuild has already happened.
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((typeUrl) => typeUrl.startsWith('.'))).toBe(true);
  });

  test('a buf-shaped client (dot-free type_url) is understood by a legacy server', async ({ expect }) => {
    const [clientPort, serverPort] = createLinkedPorts();
    const { port, seen } = rewriteOutgoingTypeUrl(clientPort, stripLeadingDot);
    await withPair(port, serverPort, async (client) => {
      expect((await client.rpc.TestService.testCall({ data: 'request' })).data).toEqual('echo:request');
    });

    expect(seen.some((typeUrl) => typeUrl.startsWith('.'))).toBe(true);
  });

  test('a buf-shaped server (dot-free type_url) is understood by a legacy client', async ({ expect }) => {
    const [clientPort, serverPort] = createLinkedPorts();
    const { port, seen } = rewriteOutgoingTypeUrl(serverPort, stripLeadingDot);
    await withPair(clientPort, port, async (client) => {
      expect((await client.rpc.TestService.testCall({ data: 'request' })).data).toEqual('echo:request');
    });

    expect(seen.some((typeUrl) => typeUrl.startsWith('.'))).toBe(true);
  });

  test('a legacy peer talking to one that expects dots still round-trips', async ({ expect }) => {
    // The reverse direction, for when only one side of a deployment has been rebuilt.
    const [clientPort, serverPort] = createLinkedPorts();
    const { port, seen } = rewriteOutgoingTypeUrl(clientPort, addLeadingDot);
    await withPair(port, serverPort, async (client) => {
      expect((await client.rpc.TestService.testCall({ data: 'request' })).data).toEqual('echo:request');
    });

    expect(seen.length).toBeGreaterThan(0);
  });
});

type Rewriter = (typeUrl: string) => string;

type Bundle = { TestService: TestService };

/**
 * Wraps a port so every `Any.type_url` leaving it is rewritten, making one peer emit exactly what a
 * `DescService`-backed implementation would. Counts rewrites so a fixture cannot pass vacuously.
 */
const rewriteOutgoingTypeUrl = (port: RpcPort, rewrite: Rewriter) => {
  const seen: string[] = [];
  const wrapped: RpcPort = {
    send: (msg, timeout) => {
      const decoded = codec.decode(msg, { preserveAny: true });
      for (const payload of [decoded.request?.payload, decoded.response?.payload]) {
        if (payload?.type_url) {
          seen.push(payload.type_url);
          payload.type_url = rewrite(payload.type_url);
        }
      }
      return port.send(codec.encode(decoded, { preserveAny: true }), timeout);
    },
    subscribe: (cb) => port.subscribe(cb),
  };

  return { port: wrapped, seen };
};

const stripLeadingDot: Rewriter = (typeUrl) => (typeUrl.startsWith('.') ? typeUrl.slice(1) : typeUrl);
const addLeadingDot: Rewriter = (typeUrl) => (typeUrl.startsWith('.') ? typeUrl : `.${typeUrl}`);

/** Opens a peer pair, runs `body`, and closes both regardless of the outcome. */
const withPair = async (
  clientPort: RpcPort,
  serverPort: RpcPort,
  body: (client: ProtoRpcPeer<Bundle>) => Promise<void>,
): Promise<void> => {
  const { server, client } = openPair(clientPort, serverPort);
  await Promise.all([server.open(), client.open()]);
  try {
    await body(client);
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
};

const openPair = (clientPort: RpcPort, serverPort: RpcPort) => {
  const server = createProtoRpcPeer({
    exposed: { TestService: schema.getService('example.testing.rpc.TestService') },
    handlers: {
      TestService: {
        testCall: async (req: { data?: string }) => ({ data: `echo:${req.data}` }),
        voidCall: async () => {},
      },
    },
    port: serverPort,
  });

  const client = createProtoRpcPeer({
    requested: { TestService: schema.getService('example.testing.rpc.TestService') },
    port: clientPort,
  });

  return { server, client };
};
