//
// Copyright 2025 DXOS.org
//

import { type ActionLike } from '@dxos/app-graph';
import { getHostPlatform } from '@dxos/util';

export const getShortcut = (action: ActionLike) => {
  return typeof action.properties?.keyBinding === 'string'
    ? action.properties.keyBinding
    : action.properties?.keyBinding?.[getHostPlatform()];
};

export const fallbackIcon = 'ph--placeholder--regular';
