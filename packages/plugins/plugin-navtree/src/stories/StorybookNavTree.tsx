//
// Copyright 2025 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { NavTree, NavTreeContext, type NavTreeContextValue, type NavTreeProps } from '../components';
import { type NavTreeItemGraphNode } from '../types';

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
  const [tab, setTab] = useState('never');

  const contextValue = useMemo(
    () => ({
      tab,
      onTabChange: (node: NavTreeItemGraphNode) => setTab(node.id),
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
      setTab,
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
