//
// Copyright 2026 DXOS.org
//

import { DXN } from '@dxos/keys';

import { RegistryNamespace } from './namespace.ts';

/** Cascade-disable confirmation dialog surface id. */
export const DISABLE_DEPENDENTS_DIALOG = DXN.make(`${RegistryNamespace.key}.disableDependentsDialog`);

/** Graph node id of the plugins panel in a space's settings section. */
export const SPACE_SETTINGS_ID = 'plugins';

/** Surface type of that panel's article. */
export const SPACE_SETTINGS_TYPE = `${RegistryNamespace.key}.space-settings`;
