//
// Copyright 2026 DXOS.org
//

import manifestUrl from './bundle/autocue.json?url';

/**
 * A bundle served by the story's dev server: `pack.mjs`'s manifest shape around a published chess take, so the
 * article plays real video without an upload.
 */
export const FIXTURE_BUNDLE_URL = new URL(manifestUrl, globalThis.location?.href ?? 'http://localhost/').href;
