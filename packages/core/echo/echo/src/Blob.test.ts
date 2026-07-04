//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Blob from './Blob';

describe('Blob', () => {
  test('inline data schema roundtrip', ({ expect }) => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const data = Blob.inlineData(bytes);
    const decoded = Schema.decodeUnknownSync(Blob.BlobData)(data);
    expect(decoded).toEqual({ _tag: 'inline', bytes });
  });

  test('external data schema roundtrip', ({ expect }) => {
    const data = Blob.externalData('sha256:deadbeef');
    const decoded = Schema.decodeUnknownSync(Blob.BlobData)(data);
    expect(decoded).toEqual({ _tag: 'external', uri: 'sha256:deadbeef' });
  });

  test('rejects an unknown tag', ({ expect }) => {
    expect(() => Schema.decodeUnknownSync(Blob.BlobData)({ _tag: 'bogus' })).toThrow();
  });

  test('make constructs a valid Blob object', ({ expect }) => {
    const bytes = new Uint8Array([1, 2, 3]);
    const blob = Blob.make({ type: 'image/png', size: bytes.length, data: Blob.inlineData(bytes) });
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBe(bytes.length);
    expect(blob.data).toEqual({ _tag: 'inline', bytes });
  });

  test('Storage constants', ({ expect }) => {
    expect(Blob.Storage.inline).toBe('inline');
    expect(Blob.Storage.edge).toBe('edge');
  });

  test('Scheme constants', ({ expect }) => {
    expect(Blob.Scheme.sha256).toBe('sha256');
  });
});
