//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Party } from '@dxos/client';
import { truncateKey } from '@dxos/debug';

type Order = { [key: string]: string }

interface DragAndDropDebugPanelProps {
  order: Order
  party?: Party
  width? : number | string
}

export const DragAndDropDebugPanel = ({
  order,
  party
}: DragAndDropDebugPanelProps) => {
  const getStringToDisplay = (key: string) => {
    if (!party) {
      return truncateKey(key, 5);
    }
    const [item] = party?.select({ id: key }).exec().entities ?? [];
    return truncateKey(key, 5) + ' - ' + item?.model.get('title').substring(0, 5);
  };

  const reduceKeyLength = (order: {[key: string]: string}) => Object.assign({}, ...Object.entries(order ?? {}).map(([leftId, rightId]) => ({
    [getStringToDisplay(leftId)]: getStringToDisplay(rightId)
  })));

  return (
    <pre style={{ margin: 0 }}>{JSON.stringify(reduceKeyLength(order), undefined, 2)}</pre>
  );
};
