//
// Copyright 2026 DXOS.org
//

/**
 * Name this backend registers under on the ECHO Hypergraph, and the value `Blob.fromBytes`'s
 * `storage` option takes when it is selected.
 */
export const S3_BACKEND = 's3';

/** URI scheme this backend resolves at read time. */
export const S3_SCHEME = 's3';

/**
 * Signing region for endpoints that do not encode one. R2 ignores the region but SigV4 still
 * requires a value in the credential scope, and `auto` is what Cloudflare documents.
 */
export const DEFAULT_REGION = 'auto';

/** Lifetime of a presigned GET URL. Long enough to render a large asset, short enough to not be a handout. */
export const PRESIGN_EXPIRY_SECONDS = 15 * 60;

/** Abort a bucket request after this many ms so a hung call cannot wedge an upload or a render. */
export const S3_TIMEOUT_MS = 60_000;
