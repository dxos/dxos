//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Tabs } from '@dxos/react-ui-tabs';

import { L0Menu } from './L0Menu';
import { L1Panels } from './L1Panels';
import { useNavTreeContext } from './NavTreeContext';
import { type NavTreeProps } from './types';
import { useLoadDescendents } from '../hooks';

export const NAV_TREE_ITEM = 'NavTreeItem';

export const NavTree = (props: NavTreeProps) => {
  const { getItems } = useNavTreeContext();
  const topLevelItems = getItems();
  const [currentItemId, setCurrentItemId] = useState(topLevelItems[0].id ?? 'never');

  useLoadDescendents(props.root);

  return (
    <Tabs.Root
      value={currentItemId}
      onValueChange={setCurrentItemId}
      orientation='vertical'
      verticalVariant='stateless'
    >
      <L0Menu topLevelItems={topLevelItems} />
      <L1Panels topLevelItems={topLevelItems} currentItemId={currentItemId} />
    </Tabs.Root>
  );
};
