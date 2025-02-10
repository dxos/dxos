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
  const _topLevelItems = getItems();
  // TODO(wittjosiah): Pass these separately to L0Menu to have them pinned at the bottom.
  const pinnedItems = getItems(root, 'pin-end');
  const topLevelItems = useMemo(
    () => [...topLevelActions, ..._topLevelItems, ...pinnedItems],
    [topLevelActions, _topLevelItems, pinnedItems],
  );

  useLoadDescendents(root);
  const path = useMemo(() => [id], [id]);

  return (
    // NOTE(thure): 74px (rather than rem) is intentional in order to match the size of macOS windowing controls
    <Tabs.Root value={tab} orientation='vertical' verticalVariant='stateless' classNames='relative'>
      <L0Menu topLevelItems={topLevelItems} path={path} parent={root} />
      <L1Panels topLevelItems={topLevelItems} path={path} currentItemId={tab} />
    </Tabs.Root>
  );
};
