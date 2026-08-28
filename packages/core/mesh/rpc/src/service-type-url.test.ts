//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { compatCodec } from '@dxos/protocols/buf-shape-compat';
import { RpcMessageSchema } from '@dxos/protocols/buf/dxos/rpc_pb';
import { schema } from '@dxos/protocols/proto';
import { type RpcMessage } from '@dxos/protocols/proto/dxos/rpc';

import { type RpcPort } from './rpc';
import { createProtoRpcPeer } from './service';
import { createLinkedPorts } from './testing';

// `ServiceHandler` writes protobuf.js's `fullName` into `Any.type_url`, which carries a leading dot;
// buf's `DescService` reports the same type without one. These fixtures gate `#8` by proving a peer
// is indifferent to which form it receives, so the rebuild can change it.

const codec = compatCodec<RpcMessage>(RpcMessageSchema);

type Rewriter = (typeUrl: string) => string;

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

describe('Any.type_url across the legacy/buf service boundary', () => {
  test('the legacy service path writes a dotted type_url', async () => {
    const [clientPort, serverPort] = createLinkedPorts();
    const { port, seen } = rewriteOutgoingTypeUrl(clientPort, (typeUrl) => typeUrl);
    const { server, client } = openPair(port, serverPort);
    await Promise.all([server.open(), client.open()]);

    await client.rpc.TestService.testCall({ data: 'x' });

    // Documents the value `#8` changes; if this stops being dotted the rebuild has already happened.
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((typeUrl) => typeUrl.startsWith('.'))).toBe(true);
  });

  test('a buf-shaped client (dot-free type_url) is understood by a legacy server', async () => {
    const [clientPort, serverPort] = createLinkedPorts();
    const { port, seen } = rewriteOutgoingTypeUrl(clientPort, stripLeadingDot);
    const { server, client } = openPair(port, serverPort);
    await Promise.all([server.open(), client.open()]);

    const response = await client.rpc.TestService.testCall({ data: 'request' });

    expect(response.data).toEqual('echo:request');
    expect(seen.some((typeUrl) => typeUrl.startsWith('.'))).toBe(true);
  });

  test('a buf-shaped server (dot-free type_url) is understood by a legacy client', async () => {
    const [clientPort, serverPort] = createLinkedPorts();
    const { port, seen } = rewriteOutgoingTypeUrl(serverPort, stripLeadingDot);
    const { server, client } = openPair(clientPort, port);
    await Promise.all([server.open(), client.open()]);

    const response = await client.rpc.TestService.testCall({ data: 'request' });

    expect(response.data).toEqual('echo:request');
    expect(seen.some((typeUrl) => typeUrl.startsWith('.'))).toBe(true);
  });

  test('a legacy peer talking to one that expects dots still round-trips', async () => {
    // The reverse direction, for when only one side of a deployment has been rebuilt.
    const [clientPort, serverPort] = createLinkedPorts();
    const { port, seen } = rewriteOutgoingTypeUrl(clientPort, addLeadingDot);
    const { server, client } = openPair(port, serverPort);
    await Promise.all([server.open(), client.open()]);

    const response = await client.rpc.TestService.testCall({ data: 'request' });

    expect(response.data).toEqual('echo:request');
    expect(seen.length).toBeGreaterThan(0);
  });
});
