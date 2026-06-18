//
// Copyright 2025 DXOS.org
//

import { Surface } from '@dxos/app-framework/ui';

/** Slot for content pinned to the start of the notch area in the deck banner. */
export const NotchStart: Surface.RoleToken<Record<string, unknown>> = Surface.makeType(
  'org.dxos.plugin.deck.role.notchStart',
);

/**
 * Parallel token for the version-info slot (owned by plugin-status-bar).
 * Same NSID as `VersionInfo` in plugin-status-bar/src/roles.ts; no cross-package dep needed.
 */
export const VersionInfo: Surface.RoleToken<Record<string, unknown>> = Surface.makeType(
  'org.dxos.plugin.statusBar.role.versionInfo',
);

/**
 * Parallel token for the status-bar slot (owned by plugin-status-bar).
 * Same NSID as `StatusBar` in plugin-status-bar/src/roles.ts.
 */
export const StatusBar: Surface.RoleToken<Record<string, unknown>> = Surface.makeType(
  'org.dxos.plugin.statusBar.role.statusBar',
);

/**
 * Parallel token for the keyboard-shortcuts hints overlay (owned by plugin-support).
 * Same NSID as `Hints` in plugin-support/src/roles.ts.
 */
export const Hints: Surface.RoleToken<Record<string, unknown>> = Surface.makeType('org.dxos.plugin.support.role.hints');

/**
 * Parallel token for the full keyboard-shortcuts list (owned by plugin-support).
 * Same NSID as `Keyshortcuts` in plugin-support/src/roles.ts.
 */
export const Keyshortcuts: Surface.RoleToken<Record<string, unknown>> = Surface.makeType(
  'org.dxos.plugin.support.role.keyshortcuts',
);
