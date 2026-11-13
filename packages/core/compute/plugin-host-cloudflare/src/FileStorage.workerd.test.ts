//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Blob } from '@dxos/echo';
import { SpaceId } from '@dxos/keys';
import { type PluginProtocol } from '@dxos/protocols';

import * as FileStorage from './FileStorage.ts';
import * as PluginActivation from './PluginActivation.ts';
import { TestPlugin } from './testing/index.ts';

const SPACE_ID = SpaceId.make('B2N35FBQKXIOTC5XEOCRVORIYQZHM2IBM');

/** An in-memory blob-service: the `/file/:key` routes the backend calls over `BLOB_SERVICE`. */
const fakeBlobService = (): PluginProtocol.BlobService & { files: Map<string, Uint8Array> } => {
  const files = new Map<string, Uint8Array>();
  return {
    files,
    fetch: async (input, init) => {
      const { pathname } = new URL(input);
      const key = pathname.replace(/^\/file\//, '');
      switch (init?.method) {
        case 'POST':
          files.set(key, new Uint8Array(await new Response(init.body).arrayBuffer()));
          return new Response(null, { status: 201 });
        case 'HEAD':
          return new Response(null, { status: files.has(key) ? 200 : 404 });
        default: {
          const data = files.get(key);
          return data === undefined ? new Response(null, { status: 404 }) : new Response(new Uint8Array(data));
        }
      }
    },
  };
};

describe('FileStorage', () => {
  test('offers the hosted store as a file backend beside the primary, outside its catalog', async ({ expect }) => {
    const activation = await PluginActivation.activate({ primary: TestPlugin() });
    expect(activation.failures).toEqual([]);
    expect(activation.capabilities.getAll(FileStorage.FileBackend)).toEqual([FileStorage.backend]);
    expect(activation.primary.meta.profile.key).not.toBe(FileStorage.makePlugin().meta.profile.key);
  });

  test('registers the hosted store as the default edge backend only when EDGE binds it', ({ expect }) => {
    expect(FileStorage.blobBackends({})).toEqual([]);
    expect(FileStorage.blobBackends({ BLOB_SERVICE: fakeBlobService() })).toMatchObject([
      { name: Blob.Storage.edge, default: true },
    ]);
  });

  test('writes and reads bytes through the binding', async ({ expect }) => {
    const service = fakeBlobService();
    const [{ backend }] = FileStorage.blobBackends({ BLOB_SERVICE: service });
    const data = new TextEncoder().encode('hello');
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
    const contentHash = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const { uri } = await backend.put({ spaceId: SPACE_ID, data, contentType: 'text/plain', contentHash });
    expect([...service.files.keys()]).toEqual([contentHash]);
    const read = await backend.get({ spaceId: SPACE_ID, uri });
    expect(read && new TextDecoder().decode(read)).toBe('hello');
  });
});
