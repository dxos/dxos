//
// Copyright 2025 DXOS.org
//

import { Surface } from '@dxos/app-framework/ui';

/** Slot for the main status-bar container. */
export const StatusBar: Surface.RoleToken<Record<string, unknown>> = Surface.makeType(
  'org.dxos.plugin.statusBar.role.statusBar',
);

/** Slot for the status-bar footer region. */
export const StatusBarFooter: Surface.RoleToken<Record<string, unknown>> = Surface.makeType(
  'org.dxos.plugin.statusBar.role.footer',
);

/** Slot for the version-info widget in the banner. */
export const VersionInfo: Surface.RoleToken<Record<string, unknown>> = Surface.makeType(
  'org.dxos.plugin.statusBar.role.versionInfo',
);

/** Slot for the keyboard-shortcuts hints overlay. */
export const Hints: Surface.RoleToken<Record<string, unknown>> = Surface.makeType('org.dxos.plugin.support.role.hints');

/** Slot for the full keyboard-shortcuts list. */
export const Keyshortcuts: Surface.RoleToken<Record<string, unknown>> = Surface.makeType(
  'org.dxos.plugin.support.role.keyshortcuts',
);
