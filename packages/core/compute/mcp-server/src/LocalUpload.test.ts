//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, test } from 'vitest';

import { Stage } from './LocalUpload.ts';

const stage = new Stage();

afterEach(() => stage.close());

const upload = async (bytes: Uint8Array<ArrayBuffer>) => {
  const { uploadId, url } = await stage.mint();
  const response = await fetch(url, { method: 'PUT', body: bytes });
  return { status: response.status, staged: stage.peek(uploadId) };
};

describe('LocalUpload', () => {
  test('sniffs the type of an upload sent without one', async ({ expect }) => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect((await upload(png)).staged?.type).toBe('image/png');

    const mp4 = new Uint8Array([0, 0, 0, 0x18, ...new TextEncoder().encode('ftypisom'), 0, 0, 0, 0]);
    expect((await upload(mp4)).staged?.type).toBe('video/mp4');

    const mov = new Uint8Array([0, 0, 0, 0x14, ...new TextEncoder().encode('ftypqt  '), 0, 0, 0, 0]);
    expect((await upload(mov)).staged?.type).toBe('video/quicktime');

    expect((await upload(new TextEncoder().encode('id,name\n1,Rotate\n'))).staged?.type).toBe('text/plain');
    expect((await upload(new Uint8Array([0xff, 0xfe, 0x00, 0xc3]))).staged?.type).toBe('application/octet-stream');
  });

  test('refuses a URL without its signature', async ({ expect }) => {
    const { uploadId, url } = await stage.mint();
    const unsigned = new URL(url);
    unsigned.searchParams.delete('sig');
    const response = await fetch(unsigned, { method: 'PUT', body: new Uint8Array([1]) });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(stage.peek(uploadId)).toBeUndefined();
  });
});
