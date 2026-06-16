//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { EdgeServiceClient } from './edge-service';
import * as Image from './Image';

// Live end-to-end checks against the shared Composer image service (the Cloudflare
// Worker at DEFAULT_IMAGE_SERVICE_URL). These hit the public network, so they are
// gated behind DX_RUN_IMAGE_SERVICE_E2E and skipped in CI by default.
//
//   DX_RUN_IMAGE_SERVICE_E2E=1 moon run edge-client:test -- image-service.e2e.test.ts
//
// Override the target with DX_IMAGE_SERVICE_URL to point at a staging worker.

// Require an explicit opt-in value so `DX_RUN_IMAGE_SERVICE_E2E=0` doesn't run live tests.
const ENABLED = /^(1|true)$/i.test(process.env.DX_RUN_IMAGE_SERVICE_E2E ?? '');
const SERVICE_URL = process.env.DX_IMAGE_SERVICE_URL ?? Image.DEFAULT_IMAGE_SERVICE_URL;

// 32x32 RGB gradient PNG. The worker decodes + resizes the upload, so it rejects
// degenerate inputs (a 1x1 PNG yields a 422); a real raster of modest dimensions
// is the smallest payload it reliably accepts.
const PNG_32X32_BASE64 =
  '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';

const pngBlob = (): Blob => {
  const binary = atob(PNG_32X32_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'image/png' });
};

const isAbsoluteHttpUrl = (value: string): boolean => /^https?:\/\//.test(value);

describe.skipIf(!ENABLED)('image service (live)', () => {
  const client = new EdgeServiceClient({ baseUrl: SERVICE_URL });

  test('Image.upload stores an image and returns a hosted URL', async ({ expect }) => {
    const result = await EffectEx.runPromise(Image.upload(client, pngBlob(), { filename: `e2e-${Date.now()}.png` }));
    expect(isAbsoluteHttpUrl(result.url)).toBe(true);
  });

  test('Image.thumbnail stores an image and returns a hosted URL', async ({ expect }) => {
    const result = await EffectEx.runPromise(Image.thumbnail(client, pngBlob(), { filename: `e2e-${Date.now()}.png` }));
    expect(isAbsoluteHttpUrl(result.url)).toBe(true);
  });
});
