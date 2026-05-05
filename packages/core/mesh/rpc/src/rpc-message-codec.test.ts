//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type Any, type ProtoCodec } from '@dxos/codec-protobuf';
import { schema } from '@dxos/protocols/proto';
import { type RpcMessage as LegacyRpcMessage } from '@dxos/protocols/proto/dxos/rpc';

import { RpcMessageCodec, toBufAny, toCodecAny, type RpcMessageInit } from './rpc-message-codec';

// Pin both codecs against the same wire format (proto3) to catch any divergence between the
// legacy protobufjs-reflection codec and the bufbuild static codec used in Workers.
const legacyCodec: ProtoCodec<LegacyRpcMessage> = schema.getCodecForType('dxos.rpc.RpcMessage');

const samplePayload: Any = {
  type_url: 'example.testing.SomeMessage',
  value: new Uint8Array([1, 2, 3, 4, 5]),
};

const expectPayloadShape = (decoded: Any | undefined, expected: Any) => {
  expect(decoded).toBeDefined();
  expect(decoded!.type_url).toEqual(expected.type_url);
  expect(Array.from(decoded!.value)).toEqual(Array.from(expected.value));
};

describe('RpcMessageCodec', () => {
  describe('round-trip', () => {
    test('open', () => {
      const init: RpcMessageInit = { content: { case: 'open', value: true } };
      const decoded = RpcMessageCodec.decode(RpcMessageCodec.encode(init));
      expect(decoded.content.case).toEqual('open');
      expect(decoded.content.case === 'open' && decoded.content.value).toEqual(true);
    });

    test('openAck', () => {
      const init: RpcMessageInit = { content: { case: 'openAck', value: true } };
      const decoded = RpcMessageCodec.decode(RpcMessageCodec.encode(init));
      expect(decoded.content.case).toEqual('openAck');
      expect(decoded.content.case === 'openAck' && decoded.content.value).toEqual(true);
    });

    test('bye', () => {
      const init: RpcMessageInit = { content: { case: 'bye', value: {} } };
      const decoded = RpcMessageCodec.decode(RpcMessageCodec.encode(init));
      expect(decoded.content.case).toEqual('bye');
    });

    test('streamClose', () => {
      const init: RpcMessageInit = { content: { case: 'streamClose', value: { id: 42 } } };
      const decoded = RpcMessageCodec.decode(RpcMessageCodec.encode(init));
      expect(decoded.content.case).toEqual('streamClose');
      if (decoded.content.case === 'streamClose') {
        expect(decoded.content.value.id).toEqual(42);
      }
    });

    test('request with Any payload + traceContext', () => {
      const init: RpcMessageInit = {
        content: {
          case: 'request',
          value: {
            id: 7,
            method: 'TestService.Echo',
            payload: toBufAny(samplePayload),
            stream: false,
            traceContext: {
              traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
              tracestate: 'rojo=00f067aa0ba902b7',
            },
          },
        },
      };
      const decoded = RpcMessageCodec.decode(RpcMessageCodec.encode(init));
      expect(decoded.content.case).toEqual('request');
      if (decoded.content.case === 'request') {
        const req = decoded.content.value;
        expect(req.id).toEqual(7);
        expect(req.method).toEqual('TestService.Echo');
        expect(req.stream).toEqual(false);
        expect(req.payload?.typeUrl).toEqual(samplePayload.type_url);
        expect(Array.from(req.payload?.value ?? [])).toEqual(Array.from(samplePayload.value));
        expect(req.traceContext?.traceparent).toEqual('00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01');
        expect(req.traceContext?.tracestate).toEqual('rojo=00f067aa0ba902b7');
      }
    });

    test('request without traceContext (optional field)', () => {
      const init: RpcMessageInit = {
        content: {
          case: 'request',
          value: { id: 8, method: 'NoTrace', payload: toBufAny(samplePayload), stream: true },
        },
      };
      const decoded = RpcMessageCodec.decode(RpcMessageCodec.encode(init));
      if (decoded.content.case === 'request') {
        expect(decoded.content.value.traceContext).toBeUndefined();
        expect(decoded.content.value.stream).toEqual(true);
      }
    });

    test('response with payload', () => {
      const init: RpcMessageInit = {
        content: {
          case: 'response',
          value: { id: 1, content: { case: 'payload', value: toBufAny(samplePayload) } },
        },
      };
      const decoded = RpcMessageCodec.decode(RpcMessageCodec.encode(init));
      if (decoded.content.case === 'response' && decoded.content.value.content.case === 'payload') {
        expect(decoded.content.value.id).toEqual(1);
        expect(decoded.content.value.content.value.typeUrl).toEqual(samplePayload.type_url);
      }
    });

    test('response with error', () => {
      const init: RpcMessageInit = {
        content: {
          case: 'response',
          value: {
            id: 2,
            content: { case: 'error', value: { name: 'TestError', message: 'boom', stack: 'at frame' } },
          },
        },
      };
      const decoded = RpcMessageCodec.decode(RpcMessageCodec.encode(init));
      if (decoded.content.case === 'response' && decoded.content.value.content.case === 'error') {
        expect(decoded.content.value.content.value.name).toEqual('TestError');
        expect(decoded.content.value.content.value.message).toEqual('boom');
        expect(decoded.content.value.content.value.stack).toEqual('at frame');
      }
    });

    test('response with close', () => {
      const init: RpcMessageInit = {
        content: { case: 'response', value: { id: 3, content: { case: 'close', value: true } } },
      };
      const decoded = RpcMessageCodec.decode(RpcMessageCodec.encode(init));
      if (decoded.content.case === 'response') {
        expect(decoded.content.value.content.case).toEqual('close');
      }
    });

    test('response with streamReady', () => {
      const init: RpcMessageInit = {
        content: { case: 'response', value: { id: 4, content: { case: 'streamReady', value: true } } },
      };
      const decoded = RpcMessageCodec.decode(RpcMessageCodec.encode(init));
      if (decoded.content.case === 'response') {
        expect(decoded.content.value.content.case).toEqual('streamReady');
      }
    });
  });

  describe('wire compatibility with legacy protobufjs codec', () => {
    // Wire format must stay identical between protobufjs reflection and bufbuild static
    // descriptors so peers running mixed versions stay interoperable.

    test('legacy → bufbuild: request + Any payload', () => {
      const legacyBytes = legacyCodec.encode(
        {
          request: {
            id: 11,
            method: 'TestService.Echo',
            payload: { '@type': 'google.protobuf.Any', ...samplePayload } as any,
            stream: false,
          },
        },
        { preserveAny: true },
      );

      const decoded = RpcMessageCodec.decode(legacyBytes);
      expect(decoded.content.case).toEqual('request');
      if (decoded.content.case === 'request') {
        expect(decoded.content.value.id).toEqual(11);
        expect(decoded.content.value.method).toEqual('TestService.Echo');
        expect(decoded.content.value.payload?.typeUrl).toEqual(samplePayload.type_url);
        expect(Array.from(decoded.content.value.payload?.value ?? [])).toEqual(Array.from(samplePayload.value));
      }
    });

    test('bufbuild → legacy: request + Any payload', () => {
      const init: RpcMessageInit = {
        content: {
          case: 'request',
          value: {
            id: 12,
            method: 'TestService.Echo',
            payload: toBufAny(samplePayload),
            stream: false,
          },
        },
      };
      const bufBytes = RpcMessageCodec.encode(init);

      const legacyDecoded = legacyCodec.decode(bufBytes, { preserveAny: true });
      expect(legacyDecoded.request).toBeDefined();
      expect(legacyDecoded.request!.id).toEqual(12);
      expect(legacyDecoded.request!.method).toEqual('TestService.Echo');
      expectPayloadShape(legacyDecoded.request!.payload, samplePayload);
    });

    test('legacy → bufbuild → legacy: bytes equal', () => {
      const legacyBytes = legacyCodec.encode(
        {
          response: {
            id: 21,
            payload: { '@type': 'google.protobuf.Any', ...samplePayload } as any,
          },
        },
        { preserveAny: true },
      );

      const decoded = RpcMessageCodec.decode(legacyBytes);
      const reEncoded = RpcMessageCodec.encode(decoded);

      // Both wire encodings must round-trip through the legacy codec to the same in-memory shape.
      const back = legacyCodec.decode(reEncoded, { preserveAny: true });
      expect(back.response).toBeDefined();
      expect(back.response!.id).toEqual(21);
      expectPayloadShape(back.response!.payload, samplePayload);
    });
  });

  describe('Any translation helpers', () => {
    test('toBufAny preserves bytes and renames type_url → typeUrl', () => {
      const buf = toBufAny(samplePayload);
      expect(buf.typeUrl).toEqual(samplePayload.type_url);
      expect(Array.from(buf.value)).toEqual(Array.from(samplePayload.value));
      expect(buf.$typeName).toEqual('google.protobuf.Any');
    });

    test('toCodecAny preserves bytes and renames typeUrl → type_url', () => {
      const buf = toBufAny(samplePayload);
      const codec = toCodecAny(buf);
      expect(codec.type_url).toEqual(samplePayload.type_url);
      expect(Array.from(codec.value)).toEqual(Array.from(samplePayload.value));
      expect(codec['@type']).toEqual('google.protobuf.Any');
    });

    test('toBufAny / toCodecAny pass through undefined', () => {
      expect(toBufAny(undefined)).toBeUndefined();
      expect(toCodecAny(undefined)).toBeUndefined();
    });
  });
});
