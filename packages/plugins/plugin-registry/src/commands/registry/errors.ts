//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Publishing a plugin bundle to the registry failed before or during upload. */
export class PublishError extends BaseError.extend('PublishError', 'Publish failed.') {}
