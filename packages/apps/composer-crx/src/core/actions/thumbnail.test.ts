//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { blobToDataUrl, enrichSnapshotWithThumbnail } from './thumbnail';

describe('blobToDataUrl', () => {
  test('round-trips a small known payload', async ({ expect }) => {
    const blob = new Blob([new Uint8Array([72, 105])], { type: 'image/png' });
    expect(await blobToDataUrl(blob)).toBe('data:image/png;base64,SGk=');
  });
});

describe('enrichSnapshotWithThumbnail', () => {
  test('passes through non-record inputs', async ({ expect }) => {
    expect(await enrichSnapshotWithThumbnail(undefined)).toBeUndefined();
    expect(await enrichSnapshotWithThumbnail('text')).toBe('text');
    expect(await enrichSnapshotWithThumbnail(null)).toBeNull();
  });

  test('passes through inputs without an og-image hint', async ({ expect }) => {
    const noHints = { source: { url: 'https://a.com' } };
    expect(await enrichSnapshotWithThumbnail(noHints)).toBe(noHints);

    const noOgImage = { source: { url: 'https://a.com' }, hints: { ogTitle: 'Title' } };
    expect(await enrichSnapshotWithThumbnail(noOgImage)).toBe(noOgImage);
  });

  test('passes through inputs that already carry a thumbnail', async ({ expect }) => {
    // `captureThumbnail` would throw in node (no `createImageBitmap`), so a
    // same-reference pass-through proves no capture was attempted.
    const enriched = {
      hints: { ogImage: 'https://a.com/og.png' },
      imageData: 'data:image/jpeg;base64,AAAA',
    };
    expect(await enrichSnapshotWithThumbnail(enriched)).toBe(enriched);
  });
});
