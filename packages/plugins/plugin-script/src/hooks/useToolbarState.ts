//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { live } from '@dxos/live-object';

import { type DeployState } from './deploy';

export type ScriptToolbarState = Partial<DeployState>;

// TODO(burdon): Replace with context provider?
export const useToolbarState = (initialState: ScriptToolbarState = {}) =>
  useMemo(() => live<ScriptToolbarState>(initialState), []);
