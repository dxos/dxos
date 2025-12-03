//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { type TreeProps } from '@dxos/react-ui-list';
import { Tabs } from '@dxos/react-ui-tabs';

import { useLoadDescendents } from '../../hooks';
import { type NavTreeItemGraphNode } from '../../types';
import { useNavTreeContext } from '../NavTreeContext';
import { L0Menu, L1Tabs, type L1TabsProps } from '../Sidebar';

export const NAV_TREE_ITEM = 'NavTreeItem';

export type NavTreeProps = Pick<TreeProps<NavTreeItemGraphNode>, 'id' | 'root'> & Pick<L1TabsProps, 'open'>;

export const NavTree = forwardRef<HTMLDivElement, NavTreeProps>(({ id, root, ...props }, forwardedRef) => {
  const { tab, useItems, onBack } = useNavTreeContext();
  const topLevelActions = useItems(root, { disposition: 'menu', sort: true });
  const topLevelCollections = useItems(root, { disposition: 'collection' });
  const topLevelWorkspaces = useItems(root, { disposition: 'workspace' });
  const topLevelNavigation = useItems(root, { disposition: 'navigation' });
  const l0Items = useMemo(
    () => [
      // prettier-ignore
      ...topLevelCollections,
      ...topLevelWorkspaces,
      ...topLevelNavigation,
    ],
    [topLevelCollections, topLevelWorkspaces, topLevelNavigation],
  );
  const pinnedItems = useItems(root, { disposition: 'pin-end', sort: true });
  const userAccountItem = useItems(root, { disposition: 'user-account' })[0];
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
    // TODO(thure): `Tabs.Root` forces all items that should be able to receive focus to use `Tabs.Tab(Primitive)` since
    //  it uses RovingFocus and doesn’t support moving focus to an item that is not a tab. Assess whether this situation
    //  should change including whether it should motivate a change in the design/taxonomy, or if this means this should
    //  not use `react-ui-tabs` at all.
    <Tabs.Root value={tab} orientation='vertical' verticalVariant='stateless' classNames='relative' ref={forwardedRef}>
      <L0Menu
        menuActions={topLevelActions}
        topLevelItems={l0Items}
        pinnedItems={pinnedItems}
        userAccountItem={userAccountItem}
        path={path}
        parent={root}
      />
      <L1Tabs topLevelItems={topLevelItems} path={path} currentItemId={tab} onBack={onBack} {...props} />
    </Tabs.Root>
  );
});
