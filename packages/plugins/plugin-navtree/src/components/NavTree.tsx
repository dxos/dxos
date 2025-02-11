//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { Tabs } from '@dxos/react-ui-tabs';

import { L0Menu } from './L0Menu';
import { L1Panels } from './L1Panels';
import { useNavTreeContext } from './NavTreeContext';
import { type NavTreeProps } from './types';
import { useLoadDescendents } from '../hooks';

export const NAV_TREE_ITEM = 'NavTreeItem';

export const NavTree = ({ id, root }: NavTreeProps) => {
  const { getItems, tab } = useNavTreeContext();
  const topLevelActions = getItems(root, 'item');
  const topLevelTabs = getItems();
  const pinnedItems = getItems(root, 'pin-end');
  const topLevelItems = useMemo(
    () => [...topLevelActions, ...topLevelTabs],
    [topLevelActions, topLevelTabs, pinnedItems],
  );

  useLoadDescendents(root);
  const path = useMemo(() => [id], [id]);

  return (
    // NOTE(thure): 74px (rather than rem) is intentional in order to match the size of macOS windowing controls
    <Tabs.Root value={tab} orientation='vertical' verticalVariant='stateless' classNames='relative'>
      <L0Menu topLevelItems={topLevelItems} pinnedItems={pinnedItems} path={path} parent={root} />
      <L1Panels topLevelItems={topLevelItems} path={path} currentItemId={tab} />
    </Tabs.Root>
  );
};
