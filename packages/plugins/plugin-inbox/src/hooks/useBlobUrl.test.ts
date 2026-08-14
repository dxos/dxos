//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { getAttachmentKind } from './useBlobUrl';

describe('getAttachmentKind', () => {
  test('renders PDFs in the browser viewer', ({ expect }) => {
    expect(getAttachmentKind('application/pdf')).toBe('pdf');
  });

  test('renders raster images inline', ({ expect }) => {
    expect(getAttachmentKind('image/png')).toBe('image');
    expect(getAttachmentKind('image/jpeg')).toBe('image');
  });

  test('refuses SVG', ({ expect }) => {
    // SVG carries inline script and event handlers, so it is active content, not an image.
    expect(getAttachmentKind('image/svg+xml')).toBe('unsupported');
  });

  test('refuses HTML', ({ expect }) => {
    // Same reason as SVG: a text/* prefix must not be enough to earn a render.
    expect(getAttachmentKind('text/html')).toBe('unsupported');
  });

  test('renders plain text', ({ expect }) => {
    expect(getAttachmentKind('text/plain')).toBe('text');
    expect(getAttachmentKind('text/csv')).toBe('text');
  });

  test('treats an unknown or absent type as unsupported rather than guessing', ({ expect }) => {
    expect(getAttachmentKind('application/octet-stream')).toBe('unsupported');
    expect(getAttachmentKind('application/zip')).toBe('unsupported');
    expect(getAttachmentKind(undefined)).toBe('unsupported');
    expect(getAttachmentKind('')).toBe('unsupported');
  });
});
