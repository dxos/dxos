//
// Copyright 2026 DXOS.org
//

import { type CleanupFn } from '@dxos/async';
import { Blob, Err } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';

const BASE64_CHUNK_SIZE = 0x8000;

const sha256Hex = async (data: Uint8Array): Promise<string> => {
  // WebCrypto's `BufferSource` type requires an `ArrayBuffer`-backed view, while `Uint8Array` is
  // generic over `ArrayBufferLike` (which also covers `SharedArrayBuffer`) — a real gap between
  // the DOM lib types and the TS standard lib, not fixable by typing `data` differently.
  const digest = await crypto.subtle.digest('SHA-256', data as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

// `String.fromCharCode(...bytes)` blows the call stack / argument limit for large arrays, so the
// bytes are base64-encoded in chunks.
const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + BASE64_CHUNK_SIZE));
  }
  return btoa(binary);
};

interface RegisteredBackend {
  readonly name: string;
  readonly backend: Blob.Backend;
}

/**
 * Dispatches blob reads/writes to the registered backend for a URI's scheme, and handles
 * `inline` storage natively. One instance per `HypergraphImpl`; reached by `DatabaseImpl` via
 * `graph.blobManager`. This single dispatch point is the seam for a future read-through cache.
 */
export class BlobManager {
  #backendsByScheme = new Map<string, RegisteredBackend>();
  #backendsByName = new Map<string, RegisteredBackend>();
  #defaultStorage: string = Blob.Storage.inline;

  /**
   * Storage name used when `Blob.fromBytes`'s `storage` option is omitted. Starts as `'inline'`;
   * changes when a backend is registered with `{ default: true }` (e.g. `@dxos/client` marks
   * `'edge'` as the default once configured).
   */
  get defaultStorage(): string {
    return this.#defaultStorage;
  }

  /**
   * Registers a blob storage backend under `name`, claiming its declared URI schemes for
   * read-time dispatch. Throws if another backend already claims one of those schemes. Returns a
   * cleanup function that unregisters it.
   */
  registerBackend(name: string, backend: Blob.Backend, options?: { default?: boolean }): CleanupFn {
    for (const scheme of backend.schemes) {
      if (this.#backendsByScheme.has(scheme)) {
        throw new Error(`Blob scheme already registered by another backend: ${scheme}`);
      }
    }
    if (this.#backendsByName.has(name)) {
      throw new Error(`Blob backend name already registered: ${name}`);
    }
    const registered: RegisteredBackend = { name, backend };
    for (const scheme of backend.schemes) {
      this.#backendsByScheme.set(scheme, registered);
    }
    this.#backendsByName.set(name, registered);
    if (options?.default) {
      this.#defaultStorage = name;
    }
    return () => {
      for (const scheme of backend.schemes) {
        if (this.#backendsByScheme.get(scheme) === registered) {
          this.#backendsByScheme.delete(scheme);
        }
      }
      if (this.#backendsByName.get(name) === registered) {
        this.#backendsByName.delete(name);
      }
    };
  }

  /**
   * Writes `bytes` via the named storage backend (or the configured default), returning an
   * un-added Blob object.
   */
  async createBlob(
    spaceId: SpaceId,
    bytes: Uint8Array,
    options?: { type?: string; storage?: string },
  ): Promise<Blob.Blob> {
    const storage = options?.storage ?? this.#defaultStorage;
    const data = await this.#put(spaceId, bytes, storage, options?.type);
    return Blob.make({ type: options?.type, size: bytes.byteLength, data });
  }

  /**
   * Reads a blob's bytes, dispatched by URI scheme for external storage.
   */
  async readBlob(spaceId: SpaceId, blob: Blob.Blob): Promise<Uint8Array> {
    return this.#get(spaceId, blob.data);
  }

  /**
   * Checks whether a blob's bytes are currently available.
   */
  async blobExists(spaceId: SpaceId, blob: Blob.Blob): Promise<boolean> {
    return this.#has(spaceId, blob.data);
  }

  /**
   * Returns a renderable URL for a blob, if the backend for its storage implements `getUrl`.
   */
  async getBlobUrl(spaceId: SpaceId, blob: Blob.Blob): Promise<string | undefined> {
    return this.#getUrl(spaceId, blob.data, blob.type);
  }

  async #put(spaceId: SpaceId, data: Uint8Array, storage: string, contentType?: string): Promise<Blob.BlobData> {
    if (storage === Blob.Storage.inline) {
      if (data.byteLength > Blob.MAX_INLINE_SIZE) {
        throw new Err.BlobTooLargeError({ size: data.byteLength, limit: Blob.MAX_INLINE_SIZE });
      }
      return Blob.inlineData(data);
    }

    const registered = this.#findByName(storage);
    if (!registered) {
      throw new Err.BlobNotAvailableError({ backend: storage, key: '', reason: 'backend-not-registered' });
    }

    const contentHash = await sha256Hex(data);
    let response: { uri: string };
    try {
      response = await registered.backend.put({ spaceId, data, contentType, contentHash });
    } catch (error) {
      throw new Err.BlobWriteError({ backend: storage }, { cause: error });
    }
    return Blob.externalData(response.uri);
  }

  async #get(spaceId: SpaceId, data: Blob.BlobData): Promise<Uint8Array> {
    if (data._tag === 'inline') {
      return data.bytes;
    }

    const { name, backend } = this.#resolveScheme(data.uri);
    let bytes: Uint8Array | undefined;
    try {
      bytes = await backend.get({ spaceId, uri: data.uri });
    } catch (error) {
      throw new Err.BlobNotAvailableError({ backend: name, key: data.uri, reason: 'offline' }, { cause: error });
    }
    if (bytes === undefined) {
      throw new Err.BlobNotAvailableError({ backend: name, key: data.uri, reason: 'not-found' });
    }
    return bytes;
  }

  async #has(spaceId: SpaceId, data: Blob.BlobData): Promise<boolean> {
    if (data._tag === 'inline') {
      return true;
    }

    const registered = this.#tryResolveScheme(data.uri);
    if (!registered) {
      return false;
    }
    try {
      return await registered.backend.has({ spaceId, uri: data.uri });
    } catch {
      // A rejecting backend (e.g. offline) means existence can't be confirmed — report as absent
      // rather than letting the rejection become an unrecoverable defect for callers.
      return false;
    }
  }

  async #getUrl(spaceId: SpaceId, data: Blob.BlobData, contentType?: string): Promise<string | undefined> {
    if (data._tag === 'inline') {
      return `data:${contentType ?? 'application/octet-stream'};base64,${bytesToBase64(data.bytes)}`;
    }

    const registered = this.#tryResolveScheme(data.uri);
    if (!registered?.backend.getUrl) {
      return undefined;
    }
    try {
      return await registered.backend.getUrl({ spaceId, uri: data.uri, contentType });
    } catch {
      // A rejecting backend means no renderable URL is available right now — same as not
      // implementing `getUrl` at all, rather than an unrecoverable defect for callers.
      return undefined;
    }
  }

  #findByName(name: string): RegisteredBackend | undefined {
    return this.#backendsByName.get(name);
  }

  #resolveScheme(uri: string): RegisteredBackend {
    const scheme = uri.split(':')[0];
    const registered = this.#backendsByScheme.get(scheme);
    if (!registered) {
      throw new Err.BlobNotAvailableError({ backend: scheme, key: uri, reason: 'backend-not-registered' });
    }
    return registered;
  }

  #tryResolveScheme(uri: string): RegisteredBackend | undefined {
    const scheme = uri.split(':')[0];
    return this.#backendsByScheme.get(scheme);
  }
}
