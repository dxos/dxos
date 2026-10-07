//
// Copyright 2026 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';

/**
 * The named plugin is not registered.
 *
 * Distinct from a plugin that is merely disabled: `enable`/`disable`/`remove` all take an id
 * that must already be installed, so this is the failure a user hits after a typo or after
 * naming a plugin they have not added yet.
 */
export class PluginNotFoundError extends BaseError.extend('PluginNotFoundError', 'Plugin not found') {
  constructor(id: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({
      message: `Plugin not found: ${id}. Run \`dx plugin list\` to see installed plugins.`,
      context: { id },
      ...options,
    });
  }
}

/** The named plugin is compiled into the binary, so there is nothing to uninstall. */
export class PluginNotRemovableError extends BaseError.extend('PluginNotRemovableError', 'Plugin cannot be removed') {
  constructor(id: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({
      message: `Cannot remove "${id}": it ships with this CLI. Run \`dx plugin disable ${id}\` to turn it off instead.`,
      context: { id },
      ...options,
    });
  }
}

/** The named plugin is pinned on by the host and cannot be turned off. */
export class CorePluginError extends BaseError.extend('CorePluginError', 'Plugin is required') {
  constructor(id: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({
      message: `Cannot disable "${id}": the CLI requires it. Run \`dx plugin list\` to see which plugins are core.`,
      context: { id },
      ...options,
    });
  }
}
