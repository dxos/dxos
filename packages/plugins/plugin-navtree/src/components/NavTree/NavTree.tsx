//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { type TreeProps } from '@dxos/react-ui-list';
import { Tabs } from '@dxos/react-ui-tabs';

import { useLoadDescendents } from '../../hooks';
import { type NavTreeItemGraphNode } from '../../types';
import { useNavTreeContext } from '../NavTreeContext';
import { L0Menu, L1Panels, type L1PanelsProps } from '../Sidebar';

export const NAV_TREE_ITEM = 'NavTreeItem';

export type NavTreeProps = Pick<TreeProps<NavTreeItemGraphNode>, 'id' | 'root'> & Pick<L1PanelsProps, 'open'>;

export const NavTree = ({ id, root, ...props }: NavTreeProps) => {
  const { tab, getChildItems, onBack } = useNavTreeContext();

  const topLevelActions = getChildItems(root, { disposition: 'menu', sort: true });
  const topLevelCollections = getChildItems(root, { disposition: 'collection' });
  const topLevelWorkspaces = getChildItems(root, { disposition: 'workspace' });
  const topLevelNavigation = getChildItems(root, { disposition: 'navigation' });
  const l0Items = useMemo(
    () => [
      // prettier-ignore
      ...topLevelCollections,
      ...topLevelWorkspaces,
      ...topLevelNavigation,
    ],
    [topLevelCollections, topLevelWorkspaces, topLevelNavigation],
  );
  const pinnedItems = getChildItems(root, { disposition: 'pin-end', sort: true });
  const userAccountItem = getChildItems(root, { disposition: 'user-account' })[0];
  const topLevelItems = useMemo(
    () => [
      // prettier-ignore
      ...l0Items,
      ...pinnedItems,
      ...(userAccountItem ? [userAccountItem] : []),
    ],
    [l0Items, pinnedItems, userAccountItem],
  );

  useLoadDescendents(root);
  const path = useMemo(() => [id], [id]);

  return (
    <Tabs.Root value={tab} orientation='vertical' verticalVariant='stateless' classNames='relative'>
      <L0Menu
        menuActions={topLevelActions}
        topLevelItems={l0Items}
        pinnedItems={pinnedItems}
        userAccountItem={userAccountItem}
        path={path}
        parent={root}
      />
      <L1Panels topLevelItems={topLevelItems} path={path} currentItemId={tab} onBack={onBack} {...props} />
    </Tabs.Root>
  );
};
