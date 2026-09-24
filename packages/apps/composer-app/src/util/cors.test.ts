//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { DESKTOP_ORIGINS, DEV_SERVER_ORIGIN } from './constants.ts';
import { corsHeaders, isAllowedOrigin, nativeOrigins } from './cors.ts';

const DEPLOYMENT = 'https://composer.space/api/feedback-logs';
const DESKTOP = 'http://localhost:26777';
const PRODUCTION = nativeOrigins('production');
const DEV = nativeOrigins('dev');

describe('nativeOrigins', () => {
  test('production trusts only the bundled channel ports', () => {
    expect([...PRODUCTION].sort()).toEqual([...DESKTOP_ORIGINS].sort());
    expect(PRODUCTION.has(DEV_SERVER_ORIGIN)).toBe(false);
  });

  test('every other deployment also trusts the tauri dev server', () => {
    for (const environment of ['dev', 'staging', 'preview', 'local', undefined]) {
      expect(nativeOrigins(environment).has(DEV_SERVER_ORIGIN)).toBe(true);
    }
  });
});

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
    expect(isAllowedOrigin(DEPLOYMENT, 'https://evil.example', PRODUCTION)).toBe(false);
  });

  test('every desktop channel port is admitted only when opted in', () => {
    for (const origin of DESKTOP_ORIGINS) {
      expect(isAllowedOrigin(DEPLOYMENT, origin, PRODUCTION)).toBe(true);
      expect(isAllowedOrigin(DEPLOYMENT, origin)).toBe(false);
    }
  });

  test('the dev server is admitted off production only', () => {
    expect(isAllowedOrigin(DEPLOYMENT, DEV_SERVER_ORIGIN, DEV)).toBe(true);
    expect(isAllowedOrigin(DEPLOYMENT, DEV_SERVER_ORIGIN, PRODUCTION)).toBe(false);
  });

  test('a localhost port no channel owns is not a native origin', () => {
    expect(isAllowedOrigin(DEPLOYMENT, 'http://localhost:3000', DEV)).toBe(false);
    expect(isAllowedOrigin(DEPLOYMENT, 'https://localhost:26777', DEV)).toBe(false);
  });
});

describe('corsHeaders', () => {
  test('an admitted origin is echoed back', () => {
    expect(corsHeaders(DEPLOYMENT, DESKTOP, PRODUCTION)['Access-Control-Allow-Origin']).toBe(DESKTOP);
  });

  test('a rejected origin yields no allowed origin', () => {
    expect(corsHeaders(DEPLOYMENT, DESKTOP)['Access-Control-Allow-Origin']).toBe('');
    expect(corsHeaders(DEPLOYMENT, 'https://evil.example', PRODUCTION)['Access-Control-Allow-Origin']).toBe('');
  });

  test('the upload content type is preflight-approved and the response varies on origin', () => {
    const headers = corsHeaders(DEPLOYMENT, DESKTOP, PRODUCTION);
    expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
    expect(headers['Access-Control-Allow-Methods']).toContain('POST');
    expect(headers.Vary).toBe('Origin');
  });
});
