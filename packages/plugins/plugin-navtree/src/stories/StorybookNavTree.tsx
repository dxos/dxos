//
// Copyright 2025 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { NavTree, NavTreeContext, type NavTreeContextValue, type NavTreeProps } from '../components';
import { type NavTreeItemGraphNode } from '../types';

export type StorybookNavTreeProps = NavTreeProps & NavTreeContextValue;

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
}: StorybookNavTreeProps) => {
  const [tab, setTab] = useState('never');
  const contextValue = useMemo(
    () => ({
      tab,
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
      onTabChange: (node: NavTreeItemGraphNode) => setTab(node.id),
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
      <NavTree {...props} open={true} />
    </NavTreeContext.Provider>
  );
};
