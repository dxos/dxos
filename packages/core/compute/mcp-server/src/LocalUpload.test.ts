//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';
import { afterEach, describe, test } from 'vitest';

import { Stage } from './LocalUpload.ts';
import * as McpServer from './McpServer.ts';

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

  test('quotes the file name in the returned command', async ({ expect }) => {
    const name = "it's a $HOME `id`.png";
    const { command, url } = await stage.mint(name);
    // The same words the shell would hand curl, echoed one per line instead of uploaded.
    const words = execFileSync('sh', ['-c', command.replace('curl --fail-with-body -T', "printf '%s\\n'")], {
      encoding: 'utf8',
    });
    expect(words.trimEnd().split('\n')).toEqual([`./${name}`, url]);
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

const mintedUrl = async (downloadId: string): Promise<string> => {
  const minted = await stage.downloadUrl(downloadId);
  if (!minted) {
    throw new Error(`No download ${downloadId}.`);
  }
  return minted.url;
};

describe('LocalUpload downloads', () => {
  test('serves staged bytes to the signed URL until it expires', async ({ expect }) => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const downloadId = stage.stage({ bytes, type: 'image/png', name: 'icon.png' });
    const url = await mintedUrl(downloadId);

    // Twice: an interrupted transfer is retried with the same URL.
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(url);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/png');
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    }
  });

  test('reports the capacity left after staging', ({ expect }) => {
    const before = stage.available();
    stage.stage({ bytes: new Uint8Array(1024), type: 'application/octet-stream' });
    expect(stage.available()).toBe(before - 1024);
  });

  test('refuses a download URL without its signature', async ({ expect }) => {
    const downloadId = stage.stage({ bytes: new Uint8Array([1]), type: 'text/plain' });
    const unsigned = new URL(await mintedUrl(downloadId));
    unsigned.searchParams.delete('sig');
    expect((await fetch(unsigned)).status).toBe(403);
  });

  test('saves under a bare, quoted file name', async ({ expect }) => {
    const name = McpServer.downloadFileName({
      downloadId: 'f'.repeat(32),
      name: "../../it's $HOME.png",
      type: 'image/png',
      size: 1,
    });
    expect(name).toBe("it's $HOME.png");
    const command = McpServer.downloadCommand('http://127.0.0.1:1/download/x?sig=y', name);
    const words = execFileSync('sh', ['-c', command.replace('curl --fail -sS -o', "printf '%s\\n'")], {
      encoding: 'utf8',
    });
    expect(words.trimEnd().split('\n')).toEqual([`./${name}`, 'http://127.0.0.1:1/download/x?sig=y']);
  });
});
