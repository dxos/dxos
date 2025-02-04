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
  getItems,
  getProps,
  isCurrent,
  canDrop,
  onSelect,
  ...props
}: NavTreeProps & NavTreeContextValue) => {
  const contextValue = useMemo(
    () => ({
      getActions,
      loadDescendents,
      renderItemEnd,
      popoverAnchorId,
      getItems,
      getProps,
      isCurrent,
      canDrop,
      onSelect,
    }),
    [getActions, loadDescendents, renderItemEnd, popoverAnchorId, getItems, getProps, isCurrent, canDrop, onSelect],
  );
  return (
    <NavTreeContext.Provider value={contextValue}>
      <NavTree {...props} />
    </NavTreeContext.Provider>
  );
};
