//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { create } from '@dxos/live-object';

import { type DeployState } from './deploy';
import { type ViewState } from './view';

export type ScriptToolbarState = Partial<DeployState & ViewState>;

export const useToolbarState = (initialState: ScriptToolbarState = {}) => {
  return useMemo(() => create<ScriptToolbarState>(initialState), []);
};
