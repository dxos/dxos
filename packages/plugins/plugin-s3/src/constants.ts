//
// Copyright 2026 DXOS.org
//

// The storage name, URI scheme, region default and timeouts live in `@dxos/blob/s3` alongside the
// code that uses them, so a headless host gets them without depending on this plugin.
export { DEFAULT_REGION, PRESIGN_EXPIRY_SECONDS, S3_BACKEND, S3_SCHEME, S3_TIMEOUT_MS } from '@dxos/blob/s3';
export { S3_CONNECTOR_ID } from '@dxos/compute-runtime';

/**
 * The connector's registry `source`. Unlike a single-service connector this is NOT the value that
 * lands in `AccessToken.source` — each connection stores its own bucket host there, since the
 * endpoint is what distinguishes one S3 connection from another. Only the OAuth path in the
 * coordinator reads `connector.source`, and this connector authenticates by credential form.
 */
export const S3_SOURCE = 's3';
