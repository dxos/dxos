//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { create } from '@dxos/live-object';

import { type DeployState } from './deploy';

export type ScriptToolbarState = Partial<DeployState>;

// TODO(burdon): Replace with context provider?
export const useToolbarState = (initialState: ScriptToolbarState = {}) => {
  return useMemo(() => create<ScriptToolbarState>(initialState), []);
};
