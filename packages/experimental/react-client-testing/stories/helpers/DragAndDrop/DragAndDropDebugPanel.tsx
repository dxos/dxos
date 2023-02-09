//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Space } from '@dxos/client';
import { todo, truncateKey } from '@dxos/debug';

type Order = { [key: string]: string };

interface DragAndDropDebugPanelProps {
  order: Order;
  space?: Space;
  width?: number | string;
}

export const DragAndDropDebugPanel = ({ order, space }: DragAndDropDebugPanelProps) => {
  const getStringToDisplay = (key: string) => {
    if (!space) {
      return truncateKey(key, 5);
    }
    // const [item] = space?.select({ id: key }).exec().entities ?? [];
    // return truncateKey(key, 5) + ' - ' + item?.model.get('title').substring(0, 5);
    return todo() as any;
  };

  const reduceKeyLength = (order: { [key: string]: string }) =>
    Object.assign(
      {},
      ...Object.entries(order ?? {}).map(([leftId, rightId]) => ({
        [getStringToDisplay(leftId)]: getStringToDisplay(rightId)
      }))
    );

  return <pre style={{ margin: 0 }}>{JSON.stringify(reduceKeyLength(order), undefined, 2)}</pre>;
};
