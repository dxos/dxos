//
// Copyright 2024 DXOS.org
//

import { type NavTreeItemNode } from './types';

export const getLevel = (path: NavTreeItemNode['path']) => {
  return (path?.length ?? 2) - 1;
};
