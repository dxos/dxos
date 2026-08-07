//
// Copyright 2025 DXOS.org
//

import { Role } from '@dxos/app-framework';

/** Slot for the main status-bar container. */
export const StatusBar: Role.Role<Record<string, unknown>> = Role.make('org.dxos.plugin.statusBar.role.statusBar');

/** Slot for the status-bar footer region. */
export const StatusBarFooter: Role.Role<Record<string, unknown>> = Role.make('org.dxos.plugin.statusBar.role.footer');

/** Slot for the version-info widget in the banner. */
export const VersionInfo: Role.Role<Record<string, unknown>> = Role.make('org.dxos.plugin.statusBar.role.versionInfo');

/** Slot for the keyboard-shortcuts hints overlay. */
export const Hints: Role.Role<Record<string, unknown>> = Role.make('org.dxos.plugin.support.role.hints');

/** Slot for the full keyboard-shortcuts list. */
export const Keyshortcuts: Role.Role<Record<string, unknown>> = Role.make('org.dxos.plugin.support.role.keyshortcuts');
