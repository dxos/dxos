//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { NavTree } from '../components';
import { NavTreeContext } from '../components/NavTreeContext';
import type { NavTreeContextValue, NavTreeProps } from '../components/types';

export const StorybookNavTree = ({
  getActions,
  loadDescendents,
  renderItemEnd,
  popoverAnchorId,
  ...props
}: NavTreeProps & NavTreeContextValue) => {
  const contextValue = useMemo(
    () => ({ getActions, loadDescendents, renderItemEnd, popoverAnchorId }),
    [getActions, loadDescendents, renderItemEnd, popoverAnchorId],
  );
  return (
    <NavTreeContext.Provider value={contextValue}>
      <NavTree {...props} />
    </NavTreeContext.Provider>
  );
};
