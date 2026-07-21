//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type RenderAck, type RenderRequest, decodeRenderAck, decodeRenderRequest } from './types';

describe('proxy types', () => {
  test('decodeRenderRequest round-trips a minimal request', ({ expect }) => {
    const request: RenderRequest = { version: 1, id: 'abc', url: 'https://example.com/' };
    expect(decodeRenderRequest(request)).toEqual(request);
  });

  test('decodeRenderRequest round-trips all optional fields', ({ expect }) => {
    const request: RenderRequest = {
      version: 1,
      id: 'abc',
      url: 'https://example.com/',
      waitForSelector: '.results',
      waitForMs: 500,
      timeoutMs: 10_000,
    };
    expect(decodeRenderRequest(request)).toEqual(request);
  });

  test('decodeRenderRequest drops unknown optional fields', ({ expect }) => {
    const decoded = decodeRenderRequest({ version: 1, id: 'abc', url: 'https://example.com/', junk: true });
    expect(decoded).toEqual({ version: 1, id: 'abc', url: 'https://example.com/' });
  });

  test('decodeRenderRequest rejects a version mismatch', ({ expect }) => {
    expect(decodeRenderRequest({ version: 2, id: 'abc', url: 'https://example.com/' })).toBeUndefined();
  });

  test('decodeRenderRequest rejects missing / wrong-typed fields', ({ expect }) => {
    expect(decodeRenderRequest(null)).toBeUndefined();
    expect(decodeRenderRequest({ version: 1, id: 'abc' })).toBeUndefined();
    expect(decodeRenderRequest({ version: 1, id: 1, url: 'https://example.com/' })).toBeUndefined();
    expect(decodeRenderRequest({ version: 1, id: 'abc', url: 'x', waitForMs: 'soon' })).toBeUndefined();
  });

  test('decodeRenderAck round-trips an ok ack', ({ expect }) => {
    const ack: RenderAck = { version: 1, id: 'abc', ok: true, html: '<html></html>', finalUrl: 'https://example.com/' };
    expect(decodeRenderAck(ack)).toEqual(ack);
  });

  test('decodeRenderAck round-trips an error ack', ({ expect }) => {
    const ack: RenderAck = { version: 1, id: 'abc', ok: false, error: 'timeout' };
    expect(decodeRenderAck(ack)).toEqual(ack);
  });

  test('decodeRenderAck rejects an unknown error code', ({ expect }) => {
    expect(decodeRenderAck({ version: 1, id: 'abc', ok: false, error: 'nope' })).toBeUndefined();
  });

  test('decodeRenderAck rejects a version mismatch', ({ expect }) => {
    expect(
      decodeRenderAck({ version: 2, id: 'abc', ok: true, html: '', finalUrl: 'https://example.com/' }),
    ).toBeUndefined();
  });

  test('decodeRenderAck rejects an ok ack missing html', ({ expect }) => {
    expect(decodeRenderAck({ version: 1, id: 'abc', ok: true, finalUrl: 'https://example.com/' })).toBeUndefined();
  });
});
