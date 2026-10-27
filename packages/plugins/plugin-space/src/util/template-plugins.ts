//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

/** The plugin facts {@link pluginsToEnable} reads, so it runs without a plugin manager. */
export type PluginState = {
  /** Installed plugins, by profile key, with the name a person reads. */
  readonly installed: ReadonlyMap<string, string>;
  readonly enabled: ReadonlySet<string>;
};

/**
 * The plugins a template needs that are installed but off, and those the host does not have at all; an enabled one
 * needs nothing.
 */
export const pluginsToEnable = (
  template: Pick<AppCapabilities.SpaceTemplate, 'plugins'>,
  { installed, enabled }: PluginState,
): { enable: string[]; unavailable: string[] } => {
  const required = [...new Set(template.plugins ?? [])].filter((id) => !enabled.has(id));
  return {
    enable: required.filter((id) => installed.has(id)),
    unavailable: required.filter((id) => !installed.has(id)),
  };
};
