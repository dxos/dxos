//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Telemetry from './Telemetry.ts';

const env = { DX_POSTHOG_API_KEY: 'phc_test', R2_ACCESS_KEY_ID: 'key-id', R2_SECRET_ACCESS_KEY: 'secret' };

describe('Telemetry', () => {
  test('reporting is on only with every credential, and opts out with CODE_INDEX_TELEMETRY=0', ({ expect }) => {
    expect(Telemetry.config(env)).toMatchObject({
      posthog: { apiKey: 'phc_test', host: Telemetry.DEFAULT_POSTHOG_HOST },
      r2: { bucket: Telemetry.DEFAULT_BUCKET, accountId: Telemetry.R2_ACCOUNT_ID },
    });
    expect(Telemetry.config({ ...env, R2_SECRET_ACCESS_KEY: undefined })).toBeUndefined();
    expect(Telemetry.config({ ...env, DX_POSTHOG_API_KEY: '' })).toBeUndefined();
    expect(Telemetry.config({ ...env, CODE_INDEX_TELEMETRY: '0' })).toBeUndefined();
    expect(Telemetry.config({ ...env, CODE_INDEX_TRAJECTORY_BUCKET: 'other' })?.r2.bucket).toEqual('other');
  });

  test('a PUT is signed over its headers and body, with the key path-encoded', ({ expect }) => {
    const r2 = { accountId: 'acct', bucket: 'logs', accessKeyId: 'key-id', secretAccessKey: 'secret' };
    const now = new Date('2026-10-06T12:00:00.000Z');
    const sign = (body: string) =>
      Telemetry.signPut({
        r2,
        key: 'a b/c.ndjson.gz',
        body: new TextEncoder().encode(body),
        contentType: 'application/x-ndjson',
        contentEncoding: 'gzip',
        now,
      });
    const signed = sign('one');
    expect(signed.url).toEqual('https://acct.r2.cloudflarestorage.com/logs/a%20b/c.ndjson.gz');
    expect(signed.headers['x-amz-date']).toEqual('20261006T120000Z');
    expect(signed.headers.authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=key-id\/20261006\/auto\/s3\/aws4_request, SignedHeaders=content-encoding;content-type;host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/,
    );
    expect(sign('one').headers.authorization).toEqual(signed.headers.authorization);
    expect(sign('two').headers.authorization).not.toEqual(signed.headers.authorization);
  });
});
