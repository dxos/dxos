//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import * as QueryService from './QueryService.ts';
import { protoMessage } from './service-rpc.ts';

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

  // A plain `Uint8Array`, as arrives over the browser worker MessagePort, takes protobufjs's JS
  // Reader rather than Node's native BufferReader, which is the path that corrupted this payload.
  test('the protoMessage codec no longer corrupts the same payload on the browser Reader path', () => {
    const documentJson = buildLargeString();
    const message = protoMessage('dxos.echo.query.QueryResponse');
    const encoded = Schema.encodeSync(message)({
      results: [{ id: 'obj1', spaceId: 'space1', rank: 0, documentJson }],
    });

    const decoded = Schema.decodeSync(message)(new Uint8Array(encoded));
    expect(decoded.results?.[0]?.documentJson).toEqual(documentJson);
  });
});

// A 4-byte (astral) character at char offset 8191 makes protobufjs's `utf8.read` overshoot its 8192-unit
// flush boundary, then a later block spreads a stale, reused `chunk` slot — injecting a lone low-surrogate
// (`\udfe9` for U+1F7E9) and shifting every following code unit. The corrupted string then breaks JSON.parse.
const buildLargeString = (): string => 'a'.repeat(8191) + '\u{1F7E9}' + 'b'.repeat(8192) + 'TAIL';
