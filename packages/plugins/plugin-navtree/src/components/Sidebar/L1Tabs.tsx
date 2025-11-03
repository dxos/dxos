//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type Node } from '@dxos/app-graph';

import { useLoadDescendents } from '../../hooks';
import { l0ItemType } from '../../util';
import { useNavTreeContext } from '../NavTreeContext';

import { L1Panel, type L1PanelProps } from './L1Panel';

export type L1TabsProps = Pick<L1PanelProps, 'open' | 'currentItemId' | 'onBack'> & {
  path: string[];
  topLevelItems: Node<any>[];
};

/**
 * Each space is an L1 tab.
 */
export const L1Tabs = ({ topLevelItems, onBack, ...props }: L1TabsProps) => (
  <>
    {topLevelItems.map((item) => {
      const type = l0ItemType(item);
      switch (type) {
        case 'tab':
          return <L1Panel key={item.id} item={item} {...props} onBack={onBack} />;
        case 'collection':
          return <L1PanelCollection key={item.id} item={item} {...props} />;
        default:
          return null;
      }
    })}
  </>
);

/**
 *
 */
const L1PanelCollection = ({ item, path, ...props }: L1PanelProps) => {
  const { useItems } = useNavTreeContext();
  useLoadDescendents(item);
  const collectionItems = useItems(item);
  const groupPath = useMemo(() => [...path, item.id], [item.id, path]);
  return (
    <>
      {collectionItems
        .filter((item) => l0ItemType(item) === 'tab')
        .map((item) => (
          <L1Panel key={item.id} item={item} path={groupPath} {...props} />
        ))}
    </>
  );
};
