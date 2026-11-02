//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { toFileSource } from './file-source.ts';

describe('toFileSource', () => {
  test('keeps a base64 data URL as it is', ({ expect }) => {
    expect(toFileSource('data:image/png;base64,iVBORw0KGgo=')).toEqual({
      type: 'base64',
      mediaType: 'image/png',
      data: 'iVBORw0KGgo=',
    });
  });

  test('encodes a percent-encoded data URL as base64', ({ expect }) => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"/>';
    const source = toFileSource(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
    expect(source).toEqual({ type: 'base64', mediaType: 'image/svg+xml', data: btoa(svg) });
  });

  test('defaults a data URL without a type', ({ expect }) => {
    expect(toFileSource('data:,hello')).toEqual({
      type: 'base64',
      mediaType: 'application/octet-stream',
      data: btoa('hello'),
    });
  });

  test('fetches an https URL', ({ expect }) => {
    expect(toFileSource('https://cdn.example.com/a.png')).toEqual({
      type: 'http',
      url: 'https://cdn.example.com/a.png',
    });
  });

  test('stores nothing for a URL without reachable bytes', ({ expect }) => {
    expect(toFileSource('blob:http://localhost/123')).toBeUndefined();
    expect(toFileSource('http://localhost/a.png')).toBeUndefined();
  });
});
