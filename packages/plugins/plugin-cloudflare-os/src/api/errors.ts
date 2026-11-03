//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** A call to a Cloudflare OS deployment failed; the message says what to do about it. */
export class CloudflareOsError extends BaseError.extend('CloudflareOsError', 'Cloudflare OS request failed.') {}
