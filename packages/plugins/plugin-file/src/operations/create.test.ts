//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { inlineBackend } from '../capabilities/inline-backend';
import { MAX_FILE_SIZE } from '../types';
import { FileTooLargeError, UnsupportedFileTypeError } from './create';

const makeFile = (name: string, type: string, bytes: Uint8Array): File => new File([bytes as BlobPart], name, { type });

// Database is unused by the inline backend, but the type signature requires it.
const stubDb: any = {};

describe('inlineBackend.upload', () => {
  test('produces an inline FileData for a small PNG', async ({ expect }) => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = await inlineBackend.upload(makeFile('icon.png', 'image/png', bytes), stubDb);
    expect(result.name).toBe('icon.png');
    expect(result.type).toBe('image/png');
    expect(result.size).toBe(bytes.byteLength);
    expect(result.data._tag).toBe('inline');
    expect(result.data._tag === 'inline' && result.data.bytes).toBeInstanceOf(Uint8Array);
    expect(result.data._tag === 'inline' && result.data.bytes.byteLength).toBe(bytes.byteLength);
  });

  test('produces an inline FileData for a PDF', async ({ expect }) => {
    const result = await inlineBackend.upload(makeFile('doc.pdf', 'application/pdf', new Uint8Array(1024)), stubDb);
    expect(result.type).toBe('application/pdf');
    expect(result.size).toBe(1024);
    expect(result.data._tag).toBe('inline');
  });

  test('rejects files larger than 4MB', async ({ expect }) => {
    const oversized = new Uint8Array(MAX_FILE_SIZE + 1);
    await expect(inlineBackend.upload(makeFile('big.png', 'image/png', oversized), stubDb)).rejects.toThrow(
      FileTooLargeError,
    );
  });

  test('accepts video', async ({ expect }) => {
    const result = await inlineBackend.upload(makeFile('movie.mp4', 'video/mp4', new Uint8Array(8)), stubDb);
    expect(result.type).toBe('video/mp4');
    expect(result.data._tag).toBe('inline');
  });

  test('rejects text/plain', async ({ expect }) => {
    await expect(inlineBackend.upload(makeFile('notes.txt', 'text/plain', new Uint8Array(8)), stubDb)).rejects.toThrow(
      UnsupportedFileTypeError,
    );
  });
});
