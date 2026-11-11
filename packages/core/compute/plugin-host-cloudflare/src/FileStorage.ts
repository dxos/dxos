//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { type BlobBackend, type BlobStore, type BlobTransport } from '@dxos/blob';
import { createEdgeBlobBackend } from '@dxos/blob/hosted';
import { type BlobBackendRegistration } from '@dxos/compute-runtime';
import { Blob } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import type { PluginProtocol } from '@dxos/protocols';

//
// The file storage every bundle gets on EDGE (spec D-84): EDGE binds its hosted blob store, and the host registers it
// as the `edge` blob backend and offers it as a file backend. A plugin's own file backends need an app client a bundle
// does not have, so without this every `file.create*` fails `NoBackendError` in a bundle.
//

/**
 * plugin-file's `FileCapabilities.Backend`, declared by its identifier: capabilities match by identifier, and importing
 * plugin-file here would close a cycle (plugin-file → plugin-space → plugin-builder → this package).
 */
export type FileBackend = {
  readonly name: string;
  readonly description?: string;
  readonly storage: string;
};

export const FileBackend = Capability.make<FileBackend>()('org.dxos.plugin.file.capability.backend');

/**
 * EDGE's hosted blob store, as the binding EDGE gives a bundle: the `/file/:key` (`GET`, `HEAD`, `POST`) and
 * `/upload/:uploadId/finalize` (`POST`) routes over a service binding.
 */
export interface BlobService {
  fetch(input: string, init?: RequestInit): Promise<Response>;
}

/**
 * The bindings EDGE gives a bundle, with the hosted blob store beside the protocol's: optional, so a bundle EDGE does
 * not give it stores files inline.
 */
export type Env = PluginProtocol.Env & {
  readonly BLOB_SERVICE?: BlobService;
};

/** Any origin works over a service binding, which routes by the binding; this one cannot pass for a public address. */
const BINDING_ORIGIN = 'https://blob-service.internal';

/** The hosted blob store as a blob backend, reached over `BLOB_SERVICE` rather than the public edge proxy. */
export const makeBackend = (blobService: BlobService): BlobBackend => {
  const call = (method: string, path: string, init: RequestInit = {}): Promise<Response> =>
    blobService.fetch(new URL(path, BINDING_ORIGIN).toString(), { method, ...init });

  const store: BlobStore = {
    put: async (key, data, options) => {
      const response = await call('POST', `/file/${key}`, {
        body: new Uint8Array(data),
        headers: options?.contentType ? { 'Content-Type': options.contentType } : undefined,
      });
      if (!response.ok) {
        throw new Error(`blob-service rejected the write of ${key}: ${response.status}`);
      }
    },
    get: async (key) => {
      const response = await call('GET', `/file/${key}`);
      if (response.status === 404) {
        return undefined;
      }
      if (!response.ok) {
        throw new Error(`blob-service failed to read ${key}: ${response.status}`);
      }
      return { data: new Uint8Array(await response.arrayBuffer()) };
    },
    has: async (key) => (await call('HEAD', `/file/${key}`)).ok,
  };

  const finalizeUpload: BlobTransport['finalizeUpload'] = async (uploadId) => {
    const response = await call('POST', `/upload/${uploadId}/finalize`);
    if (!response.ok) {
      throw new Error(
        `blob-service could not finalize upload ${uploadId}: ${response.status} ${await response.text()}`,
      );
    }
    const { key, size, contentType } = (await response.json()) as { key: string; size: number; contentType?: string };
    return { key, size, contentType };
  };

  return createEdgeBlobBackend({ store, finalizeUpload });
};

/** The blob backends to register for an invocation: the hosted store, as the default, when EDGE binds it. */
export const blobBackends = (env: Env): BlobBackendRegistration[] =>
  env.BLOB_SERVICE === undefined
    ? []
    : [{ name: Blob.Storage.edge, backend: makeBackend(env.BLOB_SERVICE), default: true }];

/** The file backend the host offers beside the bundle's plugin, for the `edge` storage {@link blobBackends} registers. */
export const backend: FileBackend = {
  name: 'Blob Service',
  description: 'The EDGE blob store, reached over the BLOB_SERVICE binding.',
  storage: Blob.Storage.edge,
};

/**
 * Activated beside every bundle's plugin. It contributes no operations, types or skills, so the bundle's catalog is
 * unchanged; plugin-file reads its backend from the shared capability manager.
 */
export const makePlugin: () => Plugin.Plugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.edgeFileStorage'), name: 'EDGE file storage' }),
).pipe(
  Plugin.addModule({
    id: 'edge-file-storage',
    activatesOn: ActivationEvents.Startup,
    provides: [FileBackend],
    activate: () => Effect.succeed([Capability.contribute(FileBackend, backend)]),
  }),
  Plugin.make,
);
