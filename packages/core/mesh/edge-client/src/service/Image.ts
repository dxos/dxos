//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

// Image service helpers built on the generic {@link EdgeServiceClient}. The
// worker exposes two contract-identical routes (`/upload` and `/thumbnail`,
// both returning `{ id, url }`); we mirror them so callers stay on whichever
// route they already use.

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { type EdgeServiceClient, type EdgeServiceError } from './edge-service';

/**
 * Default Composer image-service base URL — the Cloudflare Worker used in
 * production. Override per-environment via the client's `baseUrl`.
 */
// TODO(burdon): Get from config.
export const DEFAULT_IMAGE_SERVICE_URL = 'https://image-service-main.dxos.workers.dev';

/** Hosted image returned by the service: a CDN `url` and its storage `id`. */
export const Result = Schema.Struct({
  id: Schema.optional(Schema.String),
  url: Schema.String,
});
export type Result = typeof Result.Type;

export type UploadOptions = {
  /** Multipart field name. */
  field?: string;
  /** Upload filename. */
  filename?: string;
};

/** Store an image and return its hosted CDN URL (POST `/upload`). */
export const upload = (
  client: EdgeServiceClient,
  blob: Blob,
  opts?: UploadOptions,
): Effect.Effect<Result, EdgeServiceError> => uploadToPath(client, blob, '/upload', opts);

/** Store an image and create a thumbnail, returning its hosted CDN URL (POST `/thumbnail`). */
export const thumbnail = (
  client: EdgeServiceClient,
  blob: Blob,
  opts?: UploadOptions,
): Effect.Effect<Result, EdgeServiceError> => uploadToPath(client, blob, '/thumbnail', opts);

const uploadToPath = (
  client: EdgeServiceClient,
  blob: Blob,
  path: string,
  opts?: UploadOptions,
): Effect.Effect<Result, EdgeServiceError> => {
  const form = new FormData();
  form.append(opts?.field ?? 'file', blob, opts?.filename ?? 'image');
  return client.postForm(path, form, Result);
};
