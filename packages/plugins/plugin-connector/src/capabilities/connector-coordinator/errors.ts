//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** The OAuth flow could not be started — the native handoff or the EDGE initiate call failed. */
export class OAuthFlowError extends BaseError.extend('OAuthFlowError', 'Unable to start OAuth flow.') {}
