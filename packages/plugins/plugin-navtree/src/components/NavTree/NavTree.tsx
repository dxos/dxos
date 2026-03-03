//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { type Node } from '@dxos/app-graph';
import { Tabs } from '@dxos/react-ui-tabs';

import { useFilteredItems, useLoadDescendents } from '../../hooks';
import { useNavTreeContext } from '../NavTreeContext';
import { L0Menu, L1Tabs, type L1TabsProps } from '../Sidebar';

export const NAV_TREE_ITEM = 'NavTreeItem';

export type NavTreeProps = { id: string; root?: Node.Node; tab: string } & Pick<L1TabsProps, 'open'>;

// TODO(wittjosiah): Refactor to Radix-style.
export const NavTree = forwardRef<HTMLDivElement, NavTreeProps>(({ id, root, tab, ...props }, forwardedRef) => {
  const { onBack } = useNavTreeContext();
  const topLevelActions = useFilteredItems(root, { disposition: 'menu', sort: true });
  const topLevelWorkspaces = useFilteredItems(root, { disposition: 'workspace' });
  const l0Items = topLevelWorkspaces;
  const pinnedItems = useFilteredItems(root, { disposition: 'pin-end', sort: true });
  const userAccountItem = useFilteredItems(root, { disposition: 'user-account' })[0];
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
