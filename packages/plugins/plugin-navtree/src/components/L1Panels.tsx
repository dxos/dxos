//
// Copyright 2025 DXOS.org
//

import React, { Fragment, useMemo } from 'react';

import { type Node } from '@dxos/app-graph';
import { Tree } from '@dxos/react-ui-list';
import { Tabs } from '@dxos/react-ui-tabs';

import { useNavTreeContext } from './NavTreeContext';
import { NavTreeItemColumns } from './NavTreeItemColumns';
import { useLoadDescendents } from '../hooks';
import { l0ItemType } from '../util';

type L1PanelProps = { item: Node<any>; path: string[]; currentItemId: string };

const L1Panel = ({ item, path, currentItemId }: L1PanelProps) => {
  const navTreeContext = useNavTreeContext();
  const itemPath = useMemo(() => [...path, item.id], [item.id, path]);
  return (
    <Tabs.Tabpanel key={item.id} value={item.id}>
      {item.id === currentItemId && (
        <Tree
          {...navTreeContext}
          id={item.id}
          root={item}
          path={itemPath}
          draggable
          gridTemplateColumns='[tree-row-start] 1fr min-content min-content min-content [tree-row-end]'
          renderColumns={NavTreeItemColumns}
        />
      )}
    </Tabs.Tabpanel>
  );
};

const L1PanelCollection = ({ item, path, currentItemId }: L1PanelProps) => {
  const { getItems } = useNavTreeContext();
  useLoadDescendents(item);
  const collectionItems = getItems(item);
  const groupPath = useMemo(() => [...path, item.id], [item.id, path]);
  return (
    <>
      {collectionItems
        .filter((item) => l0ItemType(item) === 'tab')
        .map((item) => (
          <L1Panel key={item.id} item={item} path={groupPath} currentItemId={currentItemId} />
        ))}
    </>
  );
};

export const L1Panels = ({
  topLevelItems,
  path,
  currentItemId,
}: {
  topLevelItems: Node<any>[];
  path: string[];
  currentItemId: string;
}) => {
  return (
    <>
      {topLevelItems.map((item) => {
        const type = l0ItemType(item);
        switch (type) {
          case 'collection':
            return <L1PanelCollection key={item.id} item={item} path={path} currentItemId={currentItemId} />;
          case 'tab':
            return <L1Panel key={item.id} item={item} path={path} currentItemId={currentItemId} />;
          default:
            return null;
        }
      })}
    </>
  );
};
