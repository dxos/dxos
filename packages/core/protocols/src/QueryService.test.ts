//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import * as QueryService from './QueryService.ts';
import { protoMessage } from './service-rpc.ts';

// A 4-byte (astral) character at char offset 8191 makes protobufjs's `utf8.read` overshoot its 8192-unit
// flush boundary, then a later block spreads a stale, reused `chunk` slot — injecting a lone low-surrogate
// (`\udfe9` for U+1F7E9) and shifting every following code unit. The corrupted string then breaks JSON.parse.
const buildLargeString = (): string => 'a'.repeat(8191) + '\u{1F7E9}' + 'b'.repeat(8192) + 'TAIL';

describe('QueryService wire schema', () => {
  test('round-trips a >8KB documentJson containing an astral character', () => {
    const documentJson = buildLargeString();
    const response: QueryService.QueryResponse = {
      queryId: 'q1',
      results: [{ id: 'obj1', spaceId: 'space1', rank: 0, documentJson }],
    };

    const encode = Schema.encodeSync(QueryService.QueryResponse);
    const decode = Schema.decodeSync(QueryService.QueryResponse);
    const decoded = decode(encode(response));

    const decodedJson = decoded.results?.[0]?.documentJson;
    expect(decodedJson?.length).toEqual(documentJson.length);
    expect(decodedJson).toEqual(documentJson);
  });

  test('round-trips a >8KB JSON payload with an astral character (JSON.parse succeeds)', () => {
    // Emoji at absolute offset 8191 inside the JSON string; `{"body":"` is 9 chars, so 8182 leading `a`s.
    const documentJson = '{"body":"' + 'a'.repeat(8182) + '\u{1F7E9}' + 'b'.repeat(8192) + '"}';
    const response: QueryService.QueryResponse = {
      results: [{ id: 'obj1', spaceId: 'space1', rank: 0, documentJson }],
    };

    const decoded = Schema.decodeSync(QueryService.QueryResponse)(
      Schema.encodeSync(QueryService.QueryResponse)(response),
    );

    // Downstream index hydration does JSON.parse on this field; a lone surrogate would break it.
    expect(() => JSON.parse(decoded.results?.[0]?.documentJson ?? '')).not.toThrow();
  });

  // Documents the root cause the inline Effect schema replaces: the protobuf codec that previously backed
  // the query wire corrupts the same payload via `@protobufjs/utf8.read`. The bug surfaces only on the JS
  // Reader path (a plain Uint8Array, as arrives over the browser worker MessagePort), not Node's native
  // BufferReader — which is why it broke the browser mailbox story but not Node tests. Guards against
  // regressing the wire encoding back to protobuf.
  test('protobuf codec corrupts the same payload on the browser Reader path (root cause)', () => {
    const documentJson = buildLargeString();
    const message = protoMessage('dxos.echo.query.QueryResponse');
    const encoded = Schema.encodeSync(message)({
      results: [{ id: 'obj1', spaceId: 'space1', rank: 0, documentJson }],
    });

    // A plain (non-Buffer) Uint8Array forces protobufjs's JS Reader (utf8.read) instead of Node's
    // native BufferReader, matching the structured-clone bytes delivered over the worker MessagePort.
    const decoded = Schema.decodeSync(message)(new Uint8Array(encoded));
    expect(decoded.results?.[0]?.documentJson).not.toEqual(documentJson);
  });
});
