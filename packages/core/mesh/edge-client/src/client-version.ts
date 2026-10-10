//
// Copyright 2026 DXOS.org
//

import { EDGE_CLIENT_VERSION_HEADER } from '@dxos/protocols';

import { version } from '../package.json';

/**
 * This SDK's version, which EDGE checks against the oldest it serves. It releases in lockstep with the rest of the
 * SDK, and Vite tree-shakes the import to this one field.
 */
export const CLIENT_SDK_VERSION: string = version;

/** The header advertising {@link CLIENT_SDK_VERSION}, for every HTTP request to EDGE. */
export const clientSdkVersionHeaders = (): Record<string, string> => ({
  [EDGE_CLIENT_VERSION_HEADER]: CLIENT_SDK_VERSION,
});
