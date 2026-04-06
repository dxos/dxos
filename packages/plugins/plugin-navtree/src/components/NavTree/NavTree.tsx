//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Node, useConnections, useActions as useGraphActions } from '@dxos/plugin-graph';
import { Tabs } from '@dxos/react-ui-tabs';
import { byPosition } from '@dxos/util';

import { useLoadDescendents } from '#hooks';
import { useNavTreeContext } from '../NavTreeContext';
import { L0Menu, L1Tabs, type L1TabsProps } from '../Sidebar';

export const NAV_TREE_ITEM = 'NavTreeItem';

export type NavTreeProps = { id: string; root?: Node.Node; tab: string } & Pick<L1TabsProps, 'open'>;

// TODO(wittjosiah): Refactor to Radix-style.
export const NavTree = forwardRef<HTMLDivElement, NavTreeProps>(({ id, root, tab, ...props }, forwardedRef) => {
  const { onBack, onItemHover } = useNavTreeContext();
  const { topLevelActions, l0Items, pinnedItems, userAccountItem, topLevelItems } = useTopLevelNavItems(root);

  useLoadDescendents(root);
  const path = useMemo(() => [id], [id]);

  return (
    // TODO(thure): `Tabs.Root` forces all items that should be able to receive focus to use `Tabs.Tab(Primitive)` since
    //  it uses RovingFocus and doesn't support moving focus to an item that is not a tab. Assess whether this situation
    //  should change including whether it should motivate a change in the design/taxonomy, or if this means this should
    //  not use `react-ui-tabs` at all.
    <Tabs.Root value={tab} orientation='vertical' classNames='relative' ref={forwardedRef}>
      <L0Menu
        menuActions={topLevelActions}
        topLevelItems={l0Items}
        pinnedItems={pinnedItems}
        userAccountItem={userAccountItem}
        path={path}
        parent={root}
        onItemHover={onItemHover}
      />
      <L1Tabs topLevelItems={topLevelItems} path={path} currentItemId={tab} onBack={onBack} {...props} />
    </Tabs.Root>
  );
});

/**
 * Partitions root children into workspaces, pinned items, user-account, and top-level actions.
 */
const useTopLevelNavItems = (root?: Node.Node) => {
  const { graph } = useAppGraph();
  const rootId = root?.id ?? Node.RootId;
  const rootOutboundItems = useConnections(graph, rootId, 'child');
  const rootActions = useGraphActions(graph, rootId);

  const { topLevelActions, l0Items, pinnedItems, userAccountItem } = useMemo(() => {
    const topLevelWorkspaces: Node.Node[] = [];
    const outboundPinnedItems: Node.Node[] = [];
    let userAccountItem: Node.Node | undefined;
    for (const node of rootOutboundItems) {
      switch (node.properties.disposition) {
        case 'workspace':
          topLevelWorkspaces.push(node);
          break;
        case 'pin-end':
          outboundPinnedItems.push(node);
          break;
        case 'user-account':
          userAccountItem ??= node;
          break;
      }
    }

    const topLevelActions = rootActions
      .filter((action) => action.properties.disposition === 'menu')
      .toSorted((a, b) => byPosition(a.properties, b.properties));
    const pinnedItems = [
      ...outboundPinnedItems,
      ...rootActions.filter((action) => action.properties.disposition === 'pin-end'),
    ].toSorted((a, b) => byPosition(a.properties, b.properties));

    return {
      topLevelActions,
      l0Items: topLevelWorkspaces,
      pinnedItems,
      userAccountItem,
    };
  }, [rootActions, rootOutboundItems]);

  const topLevelItems = useMemo(
    () => [...l0Items, ...pinnedItems, ...(userAccountItem ? [userAccountItem] : [])],
    [l0Items, pinnedItems, userAccountItem],
  );

  return { topLevelActions, l0Items, pinnedItems, userAccountItem, topLevelItems };
};
