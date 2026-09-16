//
// Copyright 2025 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';

/** Pinned (non-space) workspace ID anchoring the settings graph subtree, and its URL workspace token. */
export const SETTINGS_ID = 'dxos:settings';
export const SETTINGS_KEY = 'settings';

/**
 * Canonical qualified path to a specific plugin's section in the settings workspace.
 * Segments are joined using the `settings:plugin-id` convention.
 */
export const getPluginSettingsSectionPath = (pluginId: string): string =>
  GraphPath.getSpacePath(SETTINGS_ID, `${SETTINGS_KEY}:${pluginId.replaceAll('/', ':')}`);

/** Canonical qualified path to the plugin registry section in the settings workspace. */
export const getPluginRegistrySectionPath = (): string =>
  GraphPath.getSpacePath(SETTINGS_ID, `${SETTINGS_KEY}:plugins`);
