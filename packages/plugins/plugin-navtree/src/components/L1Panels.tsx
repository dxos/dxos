//
// Copyright 2025 DXOS.org
//

import React, { Fragment } from 'react';

import { type Node } from '@dxos/app-graph';
import { Tree } from '@dxos/react-ui-list';
import { Tabs } from '@dxos/react-ui-tabs';

import { useNavTreeContext } from './NavTreeContext';
import { NavTreeItemColumns } from './NavTreeItemColumns';
import { useLoadDescendents } from '../hooks';
import { l0ItemType } from '../util';

type L1PanelProps = { item: Node<any>; currentItemId: string };

const L1Panel = ({ item, currentItemId }: L1PanelProps) => {
  const navTreeContext = useNavTreeContext();
  console.log('[L1Panel]', item.id, currentItemId);
  return (
    <Tabs.Tabpanel key={item.id} value={item.id}>
      {item.id === currentItemId && (
        <Tree
          {...navTreeContext}
          id={item.id}
          root={item}
          draggable
          gridTemplateColumns='[tree-row-start] 1fr min-content min-content min-content [tree-row-end]'
          renderColumns={NavTreeItemColumns}
        />
      )}
    </Tabs.Tabpanel>
  );
};

const L1PanelCollection = ({ item, currentItemId }: L1PanelProps) => {
  const { getItems } = useNavTreeContext();
  useLoadDescendents(item);
  const collectionItems = getItems(item);
  return (
    <>
      {collectionItems
        .filter((item) => l0ItemType(item) === 'tab')
        .map((item) => (
          <L1Panel key={item.id} item={item} currentItemId={currentItemId} />
        ))}
    </>
  );
};

export const L1Panels = ({ topLevelItems, currentItemId }: { topLevelItems: Node<any>[]; currentItemId: string }) => {
  return (
    <>
      {topLevelItems.map((item) => {
        const type = l0ItemType(item);
        switch (type) {
          case 'collection':
            return <L1PanelCollection key={item.id} item={item} currentItemId={currentItemId} />;
          case 'tab':
            return <L1Panel key={item.id} item={item} currentItemId={currentItemId} />;
          default:
            return null;
        }
      })}
    </>
  );
};
