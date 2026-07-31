//
// Copyright 2026 DXOS.org
//

import { type SpaceId } from '@dxos/keys';

export interface BlobPutRequest {
  spaceId: SpaceId;
  data: Uint8Array;
  contentType?: string;
  /** Lowercase hex SHA-256 digest of `data`, computed by the manager. The backend does not verify it. */
  contentHash: string;
  /** For path-addressed extension backends. */
  name?: string;
}

export interface BlobPutResponse {
  /** URI locating the stored bytes; must use a scheme the backend resolves. */
  uri: string;
}

/**
 * Implemented by pluggable blob storage backends and registered on the Hypergraph via
 * `registerBlobBackend`.
 */
export interface BlobBackend {
  /** URI schemes this backend resolves at read time. */
  readonly schemes: readonly string[];
  /** Largest `data.byteLength` this backend accepts, in bytes. `undefined` means unlimited. */
  readonly maxSize?: number;
  put(request: BlobPutRequest): Promise<BlobPutResponse>;
  /** `undefined` means the URI was not found. Rejects on transport failure (e.g. offline). */
  get(request: { spaceId: SpaceId; uri: string }): Promise<Uint8Array | undefined>;
  has(request: { spaceId: SpaceId; uri: string }): Promise<boolean>;
  getUrl?(request: { spaceId: SpaceId; uri: string; contentType?: string }): Promise<string | undefined>;
}
