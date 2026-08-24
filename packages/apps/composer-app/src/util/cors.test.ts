//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { corsHeaders, isAllowedOrigin } from './cors';

const DEPLOYMENT = 'https://composer.space/api/feedback-logs';
const DESKTOP = 'http://localhost:26777';

describe('isAllowedOrigin', () => {
  test('a same-origin request passes, with or without the header', () => {
    expect(isAllowedOrigin(DEPLOYMENT, null)).toBe(true);
    expect(isAllowedOrigin(DEPLOYMENT, 'https://composer.space')).toBe(true);
  });

  test('a preview alias is judged against its own origin, not the canonical one', () => {
    const preview = 'https://pr-1-composer-dev.dxos.workers.dev/api/feedback-logs';
    expect(isAllowedOrigin(preview, 'https://pr-1-composer-dev.dxos.workers.dev')).toBe(true);
    expect(isAllowedOrigin(preview, 'https://composer.space')).toBe(false);
  });

  test('a foreign origin is rejected either way', () => {
    expect(isAllowedOrigin(DEPLOYMENT, 'https://evil.example')).toBe(false);
    expect(isAllowedOrigin(DEPLOYMENT, 'https://evil.example', true)).toBe(false);
  });

  test('every desktop channel port is admitted only when opted in', () => {
    for (const port of [26777, 26778, 26779, 26780]) {
      expect(isAllowedOrigin(DEPLOYMENT, `http://localhost:${port}`, true)).toBe(true);
      expect(isAllowedOrigin(DEPLOYMENT, `http://localhost:${port}`)).toBe(false);
    }
  });

  test('a localhost port no channel owns is not a desktop origin', () => {
    expect(isAllowedOrigin(DEPLOYMENT, 'http://localhost:3000', true)).toBe(false);
    expect(isAllowedOrigin(DEPLOYMENT, 'https://localhost:26777', true)).toBe(false);
  });
});

describe('corsHeaders', () => {
  test('an admitted origin is echoed back', () => {
    expect(corsHeaders(DEPLOYMENT, DESKTOP, true)['Access-Control-Allow-Origin']).toBe(DESKTOP);
  });

  test('a rejected origin yields no allowed origin', () => {
    expect(corsHeaders(DEPLOYMENT, DESKTOP)['Access-Control-Allow-Origin']).toBe('');
    expect(corsHeaders(DEPLOYMENT, 'https://evil.example', true)['Access-Control-Allow-Origin']).toBe('');
  });

  test('the upload content type is preflight-approved and the response varies on origin', () => {
    const headers = corsHeaders(DEPLOYMENT, DESKTOP, true);
    expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
    expect(headers['Access-Control-Allow-Methods']).toContain('POST');
    expect(headers.Vary).toBe('Origin');
  });
});
