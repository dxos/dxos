//
// Copyright 2026 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';

/**
 * A plugin could not be installed.
 *
 * `context.reason` discriminates the failure so the command can print something actionable:
 * `'fetch-failed'` (manifest unreachable), `'manifest-invalid'` (unparseable or wrong shape),
 * `'no-manifest'` (a directory with neither `manifest.json` nor `dx.config.ts`),
 * `'unsupported-locator'` (a combination the CLI does not install), or `'duplicate-id'` (the
 * plugin claims an id the binary already ships).
 */
export class PluginInstallError extends BaseError.extend('PluginInstallError', 'Failed to install plugin') {
  constructor(options?: BaseErrorOptions) {
    super(options);
  }
}
