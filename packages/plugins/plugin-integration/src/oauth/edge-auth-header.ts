//
// Copyright 2025 DXOS.org
//

import { type EdgeHttpClient } from '@dxos/edge-client';

/**
 * Returns the Edge client's cached auth header if available.
 * Used when initiating OAuth so Edge can associate the flow with the current identity.
 */
// TODO(wittjosiah): EdgeHttpClient does not expose this publicly. Prefer adding a proper API
//   (e.g. getAuthHeader() or an initiateOAuth helper) to @dxos/edge-client instead
//   of reading private _authHeader.
export const getEdgeAuthHeader = (edgeClient: EdgeHttpClient): string | undefined =>
  (edgeClient as unknown as { _authHeader?: string })._authHeader;
