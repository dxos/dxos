//
// Copyright 2025 DXOS.org
//

import { Paths } from '@dxos/app-toolkit';

export const SETTINGS_ID = Paths.pinnedWorkspaceId('dxos:settings');
export const SETTINGS_KEY = 'settings';

/**
 * Canonical qualified path to a specific plugin's section in the settings workspace.
 * Segments are joined using the `settings:plugin-id` convention.
 */
export const getPluginSettingsSectionPath = (pluginId: string): string =>
  Paths.getSpacePath(SETTINGS_ID, `${SETTINGS_KEY}:${pluginId.replaceAll('/', ':')}`);

/** Canonical qualified path to the plugin registry section in the settings workspace. */
export const getPluginRegistrySectionPath = (): string =>
  Paths.getSpacePath(SETTINGS_ID, `${SETTINGS_KEY}:plugins`);
