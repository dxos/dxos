//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { Tabs } from '@dxos/react-ui-tabs';
import { byPosition } from '@dxos/util';

import { L0Menu } from './L0Menu';
import { L1Panels } from './L1Panels';
import { useNavTreeContext } from './NavTreeContext';
import { type NavTreeProps } from './types';
import { useLoadDescendents } from '../hooks';

export const NAV_TREE_ITEM = 'NavTreeItem';

export const NavTree = ({ id, root }: NavTreeProps) => {
  const { tab, getItems, onBack } = useNavTreeContext();
  const topLevelActions = getItems(root, 'item').toSorted((a, b) => byPosition(a.properties, b.properties));
  const topLevelCollections = getItems(root, 'collection');
  const topLevelWorkspaces = getItems(root, 'workspace');
  const topLevelNavigation = getItems(root, 'navigation');
  const l0Items = useMemo(
    () => [...topLevelActions, ...topLevelCollections, ...topLevelWorkspaces, ...topLevelNavigation],
    [topLevelActions, topLevelCollections, topLevelWorkspaces, topLevelNavigation],
  );
  const pinnedItems = getItems(root, 'pin-end').toSorted((a, b) => byPosition(a.properties, b.properties));
  const topLevelItems = useMemo(() => [...l0Items, ...pinnedItems], [l0Items, pinnedItems]);

  useLoadDescendents(root);
  const path = useMemo(() => [id], [id]);

  return (
    // NOTE(thure): 74px (rather than rem) is intentional in order to match the size of macOS windowing controls
    <Tabs.Root value={tab} orientation='vertical' verticalVariant='stateless' classNames='relative'>
      <L0Menu topLevelItems={l0Items} pinnedItems={pinnedItems} path={path} parent={root} />
      <L1Panels topLevelItems={topLevelItems} path={path} currentItemId={tab} onBack={onBack} />
    </Tabs.Root>
  );
};
