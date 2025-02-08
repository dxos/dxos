//
// Copyright 2025 DXOS.org
//

import React, { useMemo, useState } from 'react';

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
  isOpen,
  onOpenChange,
  ...props
}: NavTreeProps & NavTreeContextValue) => {
  const [tab, onTabChange] = useState('never');

  const contextValue = useMemo(
    () => ({
      tab,
      onTabChange,
      getActions,
      loadDescendents,
      renderItemEnd,
      popoverAnchorId,
      getItems,
      getProps,
      isCurrent,
      isOpen,
      onOpenChange,
      canDrop,
      onSelect,
    }),
    [
      tab,
      onTabChange,
      getActions,
      loadDescendents,
      renderItemEnd,
      popoverAnchorId,
      getItems,
      getProps,
      isCurrent,
      isOpen,
      onOpenChange,
      canDrop,
      onSelect,
    ],
  );
  return (
    <NavTreeContext.Provider value={contextValue}>
      <NavTree {...props} />
    </NavTreeContext.Provider>
  );
};
