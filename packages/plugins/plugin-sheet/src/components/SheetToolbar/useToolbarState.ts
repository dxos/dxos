//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { live } from '@dxos/live-object';

import { type AlignState } from './align';
import { type CommentState } from './comment';
import { type StyleState } from './style';

export type ToolbarState = Partial<StyleState & AlignState & CommentState>;

export const useToolbarState = (initialState: ToolbarState = {}) => {
  return useMemo(() => live<ToolbarState>(initialState), []);
};
