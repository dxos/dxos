//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { live } from '@dxos/live-object';

import { type AlignState } from './align';
import { type StyleState } from './style';

export type ToolbarState = Partial<StyleState & AlignState>;

export const useToolbarState = (initialState: ToolbarState = {}) => useMemo(() => live<ToolbarState>(initialState), []);
