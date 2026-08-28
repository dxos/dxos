//
// Copyright 2026 DXOS.org
//

// S3-compatible blob storage. Lives beside the blob manager rather than in a plugin so any host —
// browser, CLI, or an edge function runtime — can register it; the two host-specific answers it
// needs (a bucket's credentials, and which bucket a space writes to) are supplied by the caller.

export * from './blob-backend';
export * from './constants';
export * from './s3-client';
export * from './s3-uri';
export * from './sigv4';
