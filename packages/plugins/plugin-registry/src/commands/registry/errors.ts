//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Publishing a plugin bundle to the registry failed before or during upload. */
export class PublishError extends BaseError.extend('PublishError', 'Publish failed.') {}

/** Registry command failed. The underlying failure, where there is one, is the `cause`. */
export class RegistryCommandError extends BaseError.extend('RegistryCommandError', 'Registry command failed.') {}
