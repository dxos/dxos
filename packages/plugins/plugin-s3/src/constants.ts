//
// Copyright 2026 DXOS.org
//

/** `Connector.id` / `Connection.connectorId` for the S3 connector. */
export const S3_CONNECTOR_ID = 'org.dxos.plugin.s3.connector';

/**
 * The connector's registry `source`. Unlike a single-service connector this is NOT the value that
 * lands in `AccessToken.source` — each connection stores its own bucket host there, since the
 * endpoint is what distinguishes one S3 connection from another. Only the OAuth path in the
 * coordinator reads `connector.source`, and this connector authenticates by credential form.
 */
export const S3_SOURCE = 's3';

/**
 * Name this plugin registers its `BlobBackend` under on the ECHO Hypergraph, and the value
 * `Blob.fromBytes`'s `storage` option takes when this backend is selected.
 */
export const S3_BACKEND = 's3';

/** URI scheme this plugin's `BlobBackend` resolves at read time. */
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
