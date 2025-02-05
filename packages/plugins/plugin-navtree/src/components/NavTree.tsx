//
// Copyright 2024 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { type Node } from '@dxos/app-graph';
import { Tabs } from '@dxos/react-ui-tabs';

import { L0Menu } from './L0Menu';
import { L1Panels } from './L1Panels';
import { useNavTreeContext } from './NavTreeContext';
import { type NavTreeContextValue, type NavTreeProps } from './types';
import { useLoadDescendents } from '../hooks';
import { l0ItemType } from '../util';

export const NAV_TREE_ITEM = 'NavTreeItem';

const findFirstTab = (getItems: NavTreeContextValue['getItems'], topLevelItems: Node<any>[]): string => {
  for (let i = 0; i < topLevelItems.length; i++) {
    const item = topLevelItems[i];
    switch (l0ItemType(item)) {
      case 'tab':
        return item.id;
      case 'collection': {
        const collectionItems = getItems(item);
        for (let j = 0; j < collectionItems.length; j++) {
          const collectionItem = collectionItems[j];
          if (l0ItemType(collectionItem) === 'tab') {
            return collectionItem.id;
          }
        }
      }
    }
  }
  return 'never';
};

export const NavTree = (props: NavTreeProps) => {
  const { getItems } = useNavTreeContext();
  const topLevelItems = getItems();
  const firstTab = findFirstTab(getItems, topLevelItems);
  const [currentItemId, setCurrentItemId] = useState(firstTab);

  useLoadDescendents(props.root);
  const path = useMemo(() => [props.id], [props.id]);

  return (
    // NOTE(thure): 74px (rather than rem) is intentional in order to match the size of macOS windowing controls
    <Tabs.Root
      value={currentItemId}
      onValueChange={setCurrentItemId}
      orientation='vertical'
      verticalVariant='stateless'
      classNames='grid grid-cols-[74px_1fr]'
    >
      <L0Menu topLevelItems={topLevelItems} path={path} parent={props.root} />
      <L1Panels topLevelItems={topLevelItems} path={path} currentItemId={currentItemId} />
    </Tabs.Root>
  );
};
